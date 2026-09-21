/**
 * US Holidays calculation and database seeding module.
 */

// Meeus/Jones/Butcher Gregorian Easter Algorithm
function getEasterSunday(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3 = March, 4 = April
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// Nth weekday of a month (dayOfWeek: 0 = Sun, 1 = Mon, ..., 6 = Sat)
function getNthWeekdayOfMonth(year, month, dayOfWeek, n) {
  let count = 0;
  for (let day = 1; day <= 31; day++) {
    const d = new Date(year, month - 1, day);
    if (d.getMonth() !== month - 1) break;
    if (d.getDay() === dayOfWeek) {
      count++;
      if (count === n) {
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }
  }
}

// Last weekday of a month
function getLastWeekdayOfMonth(year, month, dayOfWeek) {
  const lastDay = new Date(year, month, 0).getDate();
  for (let day = lastDay; day >= 1; day--) {
    const d = new Date(year, month - 1, day);
    if (d.getDay() === dayOfWeek) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }
}

export function getHolidaysForYear(year) {
  const holidays = [
    { title: "New Year's Day", date: `${year}-01-01`, description: "US Federal Holiday" },
    { title: "Martin Luther King Jr. Day", date: getNthWeekdayOfMonth(year, 1, 1, 3), description: "US Federal Holiday" },
    { title: "Groundhog Day", date: `${year}-02-02`, description: "US Observance" },
    { title: "Valentine's Day", date: `${year}-02-14`, description: "US Observance" },
    { title: "Presidents' Day", date: getNthWeekdayOfMonth(year, 2, 1, 3), description: "US Federal Holiday" },
    { title: "St. Patrick's Day", date: `${year}-03-17`, description: "US Observance" },
    { title: "Easter Sunday", date: getEasterSunday(year), description: "Religious Observance" },
    { title: "Earth Day", date: `${year}-04-22`, description: "US Observance" },
    { title: "Mother's Day", date: getNthWeekdayOfMonth(year, 5, 0, 2), description: "US Observance" },
    { title: "Memorial Day", date: getLastWeekdayOfMonth(year, 5, 1), description: "US Federal Holiday" },
    { title: "Father's Day", date: getNthWeekdayOfMonth(year, 6, 0, 3), description: "US Observance" },
    { title: "Juneteenth", date: `${year}-06-19`, description: "US Federal Holiday" },
    { title: "Independence Day", date: `${year}-07-04`, description: "US Federal Holiday" },
    { title: "Labor Day", date: getNthWeekdayOfMonth(year, 9, 1, 1), description: "US Federal Holiday" },
    { title: "Patriot Day (9/11)", date: `${year}-09-11`, description: "US Observance" },
    { title: "Columbus Day / Indigenous Peoples' Day", date: getNthWeekdayOfMonth(year, 10, 1, 2), description: "US Federal Holiday" },
    { title: "Halloween", date: `${year}-10-31`, description: "US Observance" },
    { title: "Veterans Day", date: `${year}-11-11`, description: "US Federal Holiday" },
    { title: "Thanksgiving Day", date: getNthWeekdayOfMonth(year, 11, 4, 4), description: "US Federal Holiday" },
    { title: "Black Friday", date: getNthWeekdayOfMonth(year, 11, 5, 4), description: "US Observance" },
    { title: "Christmas Eve", date: `${year}-12-24`, description: "US Observance" },
    { title: "Christmas Day", date: `${year}-12-25`, description: "US Federal Holiday" },
    { title: "New Year's Eve", date: `${year}-12-31`, description: "US Observance" }
  ];

  return holidays.filter(h => h.date);
}

export async function populateUSHolidays(db, startYear = 2024, endYear = 2035) {
  try {
    for (let y = startYear; y <= endYear; y++) {
      const holidays = getHolidaysForYear(y);
      for (const h of holidays) {
        const existing = await db.get(
          "SELECT id FROM calendar_events WHERE title = ? AND date(start_time) = ?",
          [h.title, h.date]
        );
        if (!existing) {
          await db.run(
            `INSERT INTO calendar_events (title, description, start_time, end_time, location, event_type, all_day) 
             VALUES (?, ?, ?, ?, ?, 'holiday', 1)`,
            [h.title, h.description || 'US Holiday', `${h.date}T00:00:00`, `${h.date}T23:59:59`, '']
          );
        } else {
          // Ensure existing has event_type = 'holiday'
          await db.run(
            "UPDATE calendar_events SET event_type = 'holiday', all_day = 1 WHERE id = ? AND (event_type IS NULL OR event_type = 'event')",
            [existing.id]
          );
        }
      }
    }
  } catch (err) {
    console.error('Failed to populate US Holidays:', err.message);
  }
}
