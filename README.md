<div dir="rtl" markdown="1">

# שימחוקלוק – שרת ההמלצות להפצת שעונים

שרת Node.js שמספק שכבת API ונתונים לוגיסטיים עבור "שימחוקלוק", מנוע המלצות להפצת שעונים. המסמך מסכם את היכולות הקיימות כרגע ומסמן לאן המערכת צפויה להתפתח.

## מה יש היום

- **בריאות שירות**: <span dir="ltr">`GET /health` → `{ ok: true }`</span> לבדיקת תקינות השרת.
- **דוחות לוגיסטיים**
  - <span dir="ltr">`GET /api/logistics/daily`</span> – תצפית יומית מורחבת על מלאי וחוסרים עם סינון לפי <span dir="ltr">`status`</span> (<span dir="ltr">`SAFE`</span> / <span dir="ltr">`CRITICAL`</span> / <span dir="ltr">`DEAD_STOCK`</span>).
  - <span dir="ltr">`GET /api/logistics/risk60d`</span> – זיהוי מוצרים שצפויים להיכנס לסיכון חוסר ב-60 הימים הבאים.
  - <span dir="ltr">`GET /api/logistics/reorder`</span> – המלצות הזמנה עם סדר עדיפויות לפי רמת סיכון ומצב.
- **ניהול חריגי ROP**
  - <span dir="ltr">`POST /api/overrides`</span> – יצירת Override ל-ROP או לכמות הזמנה עם אפשרות לציון סיבה; מבטל Override פעיל קודם לאותו מוצר.
  - <span dir="ltr">`PATCH /api/overrides/:id/disable`</span> – השבתת Override קיים.
- **הזמנות רכש**
  - <span dir="ltr">`GET /api/purchase-orders`</span> – צפייה בהזמנות רכש אחרונות (עד 200 אחרונות).
  - <span dir="ltr">`POST /api/purchase-orders`</span> – פתיחת הזמנת רכש חדשה עם כמות נדרשת ותאריך הגעה משוער (אופציונלי).
- **עדכון מלאי**
  - <span dir="ltr">`PATCH /api/inventory/:productId`</span> – עדכון או הזנת רמות מלאי (<span dir="ltr">`onHand`</span>, <span dir="ltr">`reserved`</span>, <span dir="ltr">`inTransit`</span>) עם upsert ושמירת זמני ספירה.

## ארכיטקטורה וקונפיגורציה

- **טכנולוגיה**: Express + TypeScript עם חיבור ל-PostgreSQL דרך <span dir="ltr">`pg`</span>.
- **קובץ כניסה**: <span dir="ltr">`src/server.ts`</span> מריץ את היישום עם פורט מוגדר ב-<span dir="ltr">`PORT`</span> (ברירת מחדל 3000).
- **חיבור למסד**: דרוש משתנה סביבה <span dir="ltr">`DATABASE_URL`</span> בקובץ <span dir="ltr">`.env`</span> (טעינה באמצעות <span dir="ltr">`dotenv`</span>).
- **Middleware**: טיפול שגיאות מרכזי שמחזיר 500 במקרי כשל בלתי צפויים.

### הרצה מקומית

1. התקנת תלויות: <span dir="ltr">`npm install`</span>.
2. יצירת קובץ <span dir="ltr">`.env`</span> עם <span dir="ltr">`DATABASE_URL=postgres://...`</span>.
3. פיתוח: <span dir="ltr">`npm run dev`</span> (ts-node-dev עם reload). הפקה: <span dir="ltr">`npm run build`</span> ואז <span dir="ltr">`npm start`</span>.

## מה צפוי להתווסף בהמשך

מבוסס על סיפורי המשתמש המלאים שהוגדרו:

- **מנהל מכירות**: הצעות מלאי ממוקדות לבעלי חנויות עם מגבלת תקציב (עד 15% מתקציב החנות), טיפול בחנויות חדשות דרך רשימת "הנמכרים ביותר", וסינון כפילויות כדי לא להציע פריטים שנקנו ב-30 הימים האחרונים.
- **מנהל שיווק**: דו"ח שבועי לזיהוי פער מותג (פער העולה על 30% ביחס לממוצע אזורי) עם נימוקים דמוגרפיים אוטומטיים ואפשרות לייצוא פרטי קשר לניהול קמפיינים.
- **מנהל לוגיסטיקה**: חיזוי חוסרי מלאי חכם עם מקדם עונתיות והתחשבות ב-lead time, התרעות על מלאי מת (ירידה של 40–60% בקצב מכירה), ורשימת מוצרים בסיכון.
- **בעל חנות**: אזור אישי להצגת הצעת מלאי, אישור או דחייה ועריכת כמויות; חישוב סל דינמי בזמן אמת, איסוף סיבת דחייה מחייבת, ובדיקת מסגרת אשראי שחוסמת אישור חריג.

## ידועות ומגבלות נוכחיות

- אין עדיין ניהול זהויות/הרשאות, ממשק משתמש או מנגנוני חישוב ההמלצות עצמם – ה-API מסתמך על נתונים שמגיעים ממסד PostgreSQL (למשל views ו-CTE קיימים).
- אין ולידציה שכבת-דומיין מעבר לבדיקות שדות בסיסיות (לדוגמה, בדיקת `quantity > 0`).

</div>

