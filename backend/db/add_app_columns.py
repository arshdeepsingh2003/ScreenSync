import sys
import os
from sqlalchemy import text

# Add the project root to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.db.database import engine

def add_columns():
    query1 = "ALTER TABLE apps ADD COLUMN IF NOT EXISTS default_screen_type VARCHAR(20);"
    query2 = "ALTER TABLE apps ADD COLUMN IF NOT EXISTS default_screen_url VARCHAR;"
    query3 = "ALTER TABLE apps ADD COLUMN IF NOT EXISTS default_screen_text VARCHAR;"
    
    with engine.begin() as conn:
        print("Adding default screen settings columns to 'apps' table...")
        conn.execute(text(query1))
        conn.execute(text(query2))
        conn.execute(text(query3))
        print("Successfully migrated columns on Supabase DB.")

if __name__ == "__main__":
    add_columns()
