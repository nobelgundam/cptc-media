/* คลังข้อสอบ "สถานการณ์จำลอง ยาว/ยาก" · 31900-1002 Big Data ปวส.2 · wk7
 * 30 ข้อ · สุ่ม 5/คน (ทุกคนต้องได้แตะข้อยาว) · a = index เฉลย (0-3)
 * บูรณาการหลาย concept · ตาราง+SQL ฝังในโจทย์ (self-contained · กัน AI ด้วยการทายผลจากข้อมูลจริง)
 */
window.QBANK_LONG = [
/* ---- 5V / classification (5) ---- */
{cat:"5v",q:"แอป FoodGo เก็บข้อมูลเหล่านี้ทุกวัน:\n(1) ตารางคำสั่งซื้อ order_id/เวลา/ยอดเงิน\n(2) รูปถ่ายอาหารที่ลูกค้าโพสต์\n(3) ข้อความรีวิวร้าน\n(4) พิกัด GPS คนขับทุก 3 วินาที\nข้อใดสรุปถูกต้องที่สุด",
c:["(1) Structured · (2)(3) Unstructured · (4) สะท้อน Velocity (ไหลเร็วต่อเนื่อง)","ทั้ง 4 เป็น Structured เพราะอยู่ในแอปเดียว","(2)(3)(4) Structured · (1) Unstructured","ทั้ง 4 เป็น Unstructured เพราะมาจากมือถือ"],a:0},
{cat:"5v",q:"ผู้บริหารห้างบอกว่า \"เรามีข้อมูลลูกค้า 10 ปี 5 ล้านแถว แต่ไม่เคยเอามาทำอะไรเลย\"\nสถานการณ์นี้ขาด V ตัวใดมากที่สุด",
c:["Volume (ปริมาณ)","Value (คุณค่า — ยังไม่ดึงประโยชน์จากข้อมูล)","Variety (ความหลากหลาย)","Velocity (ความเร็ว)"],a:1},
{cat:"5v",q:"ระบบเซนเซอร์โรงงานส่งค่าอุณหภูมิเครื่องจักร 1,000 ตัว ทุก 1 วินาที เข้าฐานข้อมูล\nคุณลักษณะ Big Data ที่เด่นชัดที่สุด 2 ตัวคือ",
c:["Veracity + Value","Volume (ข้อมูลสะสมมหาศาล) + Velocity (ไหลเข้าเร็วต่อเนื่อง)","Variety + Veracity","Value + Variety"],a:1},
{cat:"5v",q:"ฝ่ายวิเคราะห์พบว่า ที่อยู่ลูกค้า 30% ผิด + เบอร์โทรปลอมจำนวนมาก ทำให้ส่งโปรโมชันไม่ถึง\nปัญหานี้กระทบ V ตัวใดโดยตรง",
c:["Volume","Velocity","Veracity (ความน่าเชื่อถือ/ถูกต้องของข้อมูล)","Value เพียงอย่างเดียว"],a:2},
{cat:"5v",q:"เปรียบเทียบ 2 ระบบ:\nระบบ A เก็บตาราง SQL ที่มี schema ชัดเจน\nระบบ B เก็บไฟล์ log + JSON + รูป ปนกัน\nข้อสรุปใดถูก",
c:["A = Unstructured · B = Structured","A = Structured (มี schema) · B = Unstructured/Semi-structured (หลายรูปแบบ)","ทั้งคู่ Structured","B จัดการง่ายกว่า A เพราะไม่ต้องมี schema"],a:1},

/* ---- SELECT/WHERE ซับซ้อน (6) ---- */
{cat:"select",q:"ตาราง products:\nid | name   | price | stock\n1  | ปากกา  | 15    | 0\n2  | ดินสอ  | 8     | 50\n3  | ยางลบ  | 5     | 12\n4  | สมุด   | 25    | 3\nผลของ: SELECT name FROM products WHERE price > 10 AND stock > 0;",
c:["ปากกา, สมุด","สมุด","ปากกา, ดินสอ, สมุด","ดินสอ, ยางลบ"],a:1},
{cat:"select",q:"ตาราง customers:\nid | name   | city     | points\n1  | สมชาย  | กรุงเทพ  | 120\n2  | มานี   | ภูเก็ต   | 80\n3  | ปิติ   | กรุงเทพ  | 200\n4  | ชูใจ   | เชียงใหม่ | 50\nผลของ: SELECT COUNT(*) FROM customers WHERE city='กรุงเทพ' AND points >= 150;",
c:["1","2","3","0"],a:0},
{cat:"select",q:"ตาราง orders(order_id, amount):\n101|300  102|0  103|150  104|0  105|500\nร้านต้องการ \"จำนวนออเดอร์ที่มียอดเงินจริง (มากกว่า 0)\"\nคำสั่งใดให้ผลถูกต้อง",
c:["SELECT SUM(amount) FROM orders;","SELECT COUNT(*) FROM orders WHERE amount > 0;","SELECT COUNT(*) FROM orders;","SELECT amount FROM orders WHERE amount = 0;"],a:1},
{cat:"select",q:"ตาราง products(name, price): ปากกา15, ปากกาเจล22, ดินสอ8, ปากกาลบได้30\nผลของ: SELECT COUNT(*) FROM products WHERE name LIKE 'ปากกา%';",
c:["1","2","3","4"],a:2},
{cat:"select",q:"ต้องการดึง \"สินค้าราคา 10-20 บาท เรียงจากแพงไปถูก\" จากตาราง products\nคำสั่งใดถูกต้องที่สุด",
c:["SELECT * FROM products WHERE price BETWEEN 10 AND 20 ORDER BY price DESC;","SELECT * FROM products WHERE price IN (10,20) ORDER BY price ASC;","SELECT * FROM products WHERE price > 10 ORDER BY name;","SELECT * FROM products WHERE price BETWEEN 20 AND 10 ORDER BY price;"],a:0},
{cat:"select",q:"ตาราง students(name, score): ก80, ข45, ค90, ง55, จ72\nครูต้องการ \"นักเรียนที่สอบไม่ผ่าน (น้อยกว่า 60)\"\nผลของ: SELECT name FROM students WHERE score < 60;",
c:["ก, ค, จ","ข, ง","ค, ก","ทั้ง 5 คน"],a:1},

/* ---- JOIN/GROUP BY/HAVING ซับซ้อน (7) ---- */
{cat:"join",q:"orders(customer, qty):\nA|2  B|3  A|1  C|4  B|2\nผลของ: SELECT customer, SUM(qty) FROM orders GROUP BY customer;\nลูกค้า A ได้ผลรวมเท่าใด",
c:["1","2","3","6"],a:2},
{cat:"join",q:"orders(customer, qty): A2, B3, A1, C4, B2\nรวมต่อคน: A=3, B=5, C=4\nผลของ: SELECT customer FROM orders GROUP BY customer HAVING SUM(qty) >= 5;",
c:["A เท่านั้น","B เท่านั้น","B, C","A, B, C"],a:1},
{cat:"join",q:"ตาราง customers มี 4 คน (id 1-4) · ตาราง orders มี order ของ customer_id = 1,1,3 เท่านั้น\nผลของ: SELECT c.name, COUNT(o.order_id) FROM customers c LEFT JOIN orders o ON c.id=o.customer_id GROUP BY c.id;\nลูกค้า id=2 (ไม่มีออเดอร์) จะแสดงผลอย่างไร",
c:["ไม่แสดงในผลลัพธ์","แสดง พร้อม COUNT = 0","แสดง พร้อม COUNT = NULL ที่นับเป็น error","แสดงซ้ำ 2 แถว"],a:1},
{cat:"join",q:"orders 5 แถว · มี customer_id ที่ไม่มีในตาราง customers 2 แถว\nผลของ INNER JOIN customers ได้กี่แถว",
c:["5","3","2","7"],a:1},
{cat:"join",q:"ยอดขายต่อสินค้า (SUM qty): ปากกา 12, ดินสอ 4, ยางลบ 9, สมุด 3\nผลของ: SELECT name FROM ... GROUP BY name HAVING SUM(qty) > 8 ORDER BY SUM(qty) DESC;",
c:["ปากกา, ยางลบ","ยางลบ, ปากกา","ดินสอ, สมุด","ปากกา, ดินสอ, ยางลบ"],a:0},
{cat:"join",q:"sales(month, amount): ม.ค.100, ม.ค.50, ก.พ.200, ก.พ.0, มี.ค.300\nผลของ: SELECT month, SUM(amount) FROM sales GROUP BY month;\nเดือนใดได้ยอดรวมสูงสุด",
c:["ม.ค. (150)","ก.พ. (200)","มี.ค. (300)","ทุกเดือนเท่ากัน"],a:2},
{cat:"join",q:"ต้องการรายงาน \"ชื่อลูกค้า + ยอดสั่งซื้อรวม เฉพาะลูกค้าที่ซื้อเกิน 1,000 บาท\"\nลำดับคำสั่งที่ถูกต้องคือ",
c:["JOIN ลูกค้ากับออเดอร์ → GROUP BY ลูกค้า → HAVING SUM(amount) > 1000","WHERE SUM(amount) > 1000 → GROUP BY → JOIN","GROUP BY ก่อน JOIN แล้วใช้ WHERE","ORDER BY amount แล้ว LIMIT 1000"],a:0},

/* ---- Data Quality scenario (6) ---- */
{cat:"quality",q:"ตาราง members:\nid | name   | birth_year | phone\n1  | สมชาย  | 1995       | 081xxx\n2  | มานี   | 2519       | (ว่าง)\n3  | ปิติ   | 1880       | 082xxx\nระบุปัญหาคุณภาพที่พบ (ปีปัจจุบัน ค.ศ. 2024)",
c:["แถว 2 birth_year=2519 ผิดรูปแบบ (ใช้ พ.ศ.) · แถว 2 phone ขาด (Missing) · แถว 3 birth_year=1880 เป็น Outlier","ข้อมูลทุกแถวถูกต้องสมบูรณ์","มีแค่ปัญหา Duplicate","มีแค่ปัญหา phone ของแถว 1"],a:0},
{cat:"quality",q:"คอลัมน์ province มีค่า: 'กทม.', 'กรุงเทพ', 'กรุงเทพฯ', 'Bangkok' ปนกันสำหรับจังหวัดเดียวกัน\nนี่คือปัญหามิติใด และควรแก้อย่างไร",
c:["Completeness · เติมค่าที่ขาด","Consistency · ทำให้เป็นรูปแบบมาตรฐานเดียว (Standardize)","Outlier · ลบทิ้งทั้งหมด","Velocity · เพิ่มความเร็ว"],a:1},
{cat:"quality",q:"ร้านพบว่า ตาราง customers มีอีเมล 'a@x.com' ซ้ำกัน 3 แถว (คนละ id) แต่ชื่อต่างกัน\nควรวินิจฉัยว่า",
c:["เป็น Outlier ของอีเมล","อาจเป็น Duplicate (คนเดียวสมัครซ้ำ) หรือข้อมูลผิด — ต้องตรวจสอบก่อนรวม/ลบ","เป็นเรื่องปกติ ปล่อยไว้ได้","เป็นปัญหา Timeliness"],a:1},
{cat:"quality",q:"ตาราง orders มี 1,000 แถว · คอลัมน์ delivery_date ว่าง (NULL) 350 แถว\nคำนวณ \"ความสมบูรณ์ (Completeness)\" ของคอลัมน์นี้",
c:["35%","65% (650 จาก 1000 แถวมีค่า)","100%","350%"],a:1},
{cat:"quality",q:"ระบบบันทึกยอดขายรายวัน แต่พนักงานกรอกย้อนหลัง 1 สัปดาห์เป็นประจำ ทำให้รายงานเรียลไทม์ไม่ตรง\nปัญหามิติใดเด่นชัด",
c:["Accuracy","Timeliness (ความทันสมัย/ทันเวลาของข้อมูล)","Duplicate","Volume"],a:1},
{cat:"quality",q:"ก่อนนำข้อมูลยอดขาย 1 ปีไปวิเคราะห์หาสินค้าขายดี ขั้นตอนแรกที่ควรทำคือ",
c:["รีบสรุปกราฟทันทีเพื่อความเร็ว","ตรวจคุณภาพข้อมูลก่อน (หา Missing/Duplicate/Outlier) เพราะข้อมูลเสียทำให้ผลผิด","ลบข้อมูลครึ่งหนึ่งให้เหลือน้อยลง","เข้ารหัสข้อมูลทั้งหมด"],a:1},

/* ---- Data Cleaning scenario (6) ---- */
{cat:"clean",q:"ตาราง customers มีแถวซ้ำ (id ต่างแต่ข้อมูลเหมือนกัน) ต้องการลบให้เหลือ 1\nลำดับขั้นตอนที่ปลอดภัยที่สุดคือ",
c:["DELETE FROM customers; แล้ว INSERT ใหม่","สำรองข้อมูล → หาแถวซ้ำด้วย GROUP BY...HAVING COUNT>1 → DELETE เฉพาะตัวซ้ำส่วนเกิน","DROP TABLE customers;","UPDATE ทุกแถวให้เหมือนกัน"],a:1},
{cat:"clean",q:"คำสั่ง: UPDATE products SET price = price * 1.1;\nผลกระทบคือข้อใด",
c:["ขึ้นราคาเฉพาะแถวแรก 10%","ขึ้นราคา \"ทุกแถว\" 10% (ไม่มี WHERE)","ลบสินค้าที่ราคาเกิน","ไม่เกิดอะไรเพราะไม่มี WHERE"],a:1},
{cat:"clean",q:"พนักงานต้องการลบเฉพาะออเดอร์ที่ยกเลิก (status='cancel') แต่พิมพ์:\nDELETE FROM orders;\nผลที่เกิดขึ้นคือ",
c:["ลบเฉพาะ status='cancel'","ลบ \"ทุกแถว\" ในตาราง orders (ลืม WHERE = หายนะ)","แจ้ง error ไม่ยอมลบ","ลบแค่ 1 แถว"],a:1},
{cat:"clean",q:"คอลัมน์ phone มีค่า '081-234-5678', '0812345678', '081 234 5678' สำหรับรูปแบบที่ควรเหมือนกัน\nงานทำความสะอาดนี้เรียกว่า",
c:["การลบ Duplicate","การแปลงรูปแบบให้สอดคล้อง (Standardize/Transform)","การหา Outlier","การ Backup"],a:1},
{cat:"clean",q:"ตาราง members คอลัมน์ age มีบางแถวว่าง (NULL)\nทีมเลือกกลยุทธ์ \"เติมด้วยค่าเฉลี่ยอายุของสมาชิก\"\nข้อใดถูกต้อง",
c:["เป็นกลยุทธ์จัดการ Missing Data แบบเติมค่า (Imputation)","เป็นการลบแถว","เป็นการหา Duplicate","ทำให้เกิด Outlier ทุกแถว"],a:0},
{cat:"clean",q:"orders(qty): 3, 5, 0, -2, 4\nหลังทำความสะอาดด้วย: DELETE FROM orders WHERE qty <= 0;\nเหลือกี่แถว และค่าใดถูกลบ",
c:["เหลือ 5 แถว ไม่มีอะไรถูกลบ","เหลือ 3 แถว (ลบ 0 และ -2 ที่ผิดปกติ)","เหลือ 1 แถว","เหลือ 4 แถว (ลบเฉพาะ -2)"],a:1}
];
