"""
Excel import service for Events Portal.

Provides functionality to import events and categories from Excel files.
"""

from io import BytesIO

from fastapi import UploadFile
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import Category, Event


async def import_excel(file: UploadFile, db: AsyncSession) -> dict:
    """
    Import events and categories from an Excel file.

    Parses the Excel file with 12 sheets (one per month) and creates
    categories and events in the database.

    Expected Excel format:
    - 12 sheets named by months (Январь-Декабрь)
    - Column A: Event number (empty = category row)
    - Column B: Event name / Category name
    - Column C: Event date
    - Column D: Responsible person/department
    - Column E: Location
    - Column F: Description
    - Column G: Links (ignored during import)
    - Column H: Photos (ignored during import)

    Categories are determined by rows without a number in column A.
    Existing data is replaced, but photo files are preserved.

    Args:
        file: Uploaded Excel file (UploadFile from FastAPI).
        db: Async database session.

    Returns:
        Dictionary with import statistics:
        {
            "imported_events": int,
            "imported_categories": int,
            "errors": list[str]
        }

    Raises:
        ValueError: If file format is invalid or cannot be parsed.
    """
    from openpyxl import load_workbook

    # Read file content
    content = await file.read()
    await file.seek(0)

    if len(content) == 0:
        raise ValueError("Empty file provided")

    try:
        wb = load_workbook(BytesIO(content))
    except Exception as e:
        raise ValueError(f"Cannot parse Excel file: {str(e)}")

    months_ru = [
        'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
        'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ]

    imported_events = 0
    imported_categories = 0
    errors = []

    # Delete old events and categories (cascade)
    # Note: Photo files remain in filesystem - only DB records are deleted
    await db.execute(delete(Event))
    await db.execute(delete(Category))

    for month_num, month_name in enumerate(months_ru, 1):
        if month_name not in wb.sheetnames:
            continue

        ws = wb[month_name]
        current_category = None
        sort_order = 0

        for row in ws.iter_rows(min_row=2, values_only=True):
            # Safely extract row values with defaults
            row_values = list(row) if row else []
            # Pad to 8 columns if needed
            while len(row_values) < 8:
                row_values.append(None)

            number, name, date, responsible, location, description, links, photos = row_values[:8]

            # Skip empty rows
            if not name and not number:
                continue

            # If no number - this is a category row
            if not number and name:
                category = Category(
                    name=str(name).strip(),
                    month=month_num,
                    sort_order=sort_order
                )
                db.add(category)
                await db.flush()
                current_category = category
                imported_categories += 1
                sort_order += 1
            elif number and current_category:
                # This is an event row
                event = Event(
                    category_id=current_category.id,
                    number=str(number).strip() if number else '',
                    name=str(name).strip() if name else '',
                    event_date=str(date).strip() if date else '',
                    responsible=str(responsible).strip() if responsible else None,
                    location=str(location).strip() if location else None,
                    description=str(description).strip() if description else None,
                    sort_order=sort_order
                )
                db.add(event)
                imported_events += 1
                sort_order += 1
            elif number and not current_category:
                errors.append(
                    f"Month {month_name}, row with number '{number}': "
                    f"no category defined yet, skipping"
                )

    await db.commit()

    return {
        "imported_events": imported_events,
        "imported_categories": imported_categories,
        "errors": errors,
    }
