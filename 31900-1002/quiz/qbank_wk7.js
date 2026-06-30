/* คลังข้อสอบ Quiz ทบทวนก่อนสอบกลางภาค · 31900-1002 Big Data ปวส.2 · wk7
 * 60 ข้อ · สุ่ม 20/คน · cat: 5v|rdbms|select|join|quality|clean
 * a = index เฉลย (0-3) · เฉลย domain-correct + distractor ผิดจริง
 * SQL ทายผล ฝัง mini-table ในโจทย์ (self-contained)
 */
window.QBANK = [
/* ===== wk1 · 5V's + Structured/Unstructured (8) ===== */
{cat:"5v",q:"คุณลักษณะ 5V's ของ Big Data — ข้อใด \"ไม่ใช่\" หนึ่งใน 5V",c:["Volume (ปริมาณ)","Velocity (ความเร็ว)","Validation (การตรวจสอบสิทธิ์)","Variety (ความหลากหลาย)"],a:2},
{cat:"5v",q:"\"ข้อมูลไหลเข้ามาเร็วมากแบบเรียลไทม์ เช่น ยอดสั่งซื้อทุกวินาที\" ตรงกับ V ตัวใด",c:["Volume","Velocity","Veracity","Value"],a:1},
{cat:"5v",q:"V ที่หมายถึง \"ความน่าเชื่อถือ/ความถูกต้องของข้อมูล\" คือข้อใด",c:["Variety","Value","Veracity","Velocity"],a:2},
{cat:"5v",q:"ข้อมูลใดเป็น Structured Data",c:["คลิปวิดีโอใน TikTok","ตารางยอดขายในฐานข้อมูล MySQL","ข้อความรีวิวร้านอาหาร","รูปถ่ายสินค้า"],a:1},
{cat:"5v",q:"ข้อมูลใดเป็น Unstructured Data",c:["แถวข้อมูลลูกค้าในตาราง","รายการสินค้าในสเปรดชีต","โพสต์ข้อความ+รูปบนโซเชียล","เลขรหัสไปรษณีย์ในคอลัมน์"],a:2},
{cat:"5v",q:"\"Value\" ใน 5V's หมายถึงอะไร",c:["ขนาดไฟล์ที่ใหญ่","คุณค่า/ประโยชน์ที่ได้จากการวิเคราะห์ข้อมูล","ความเร็วในการประมวลผล","จำนวนชนิดข้อมูล"],a:1},
{cat:"5v",q:"ร้านค้าเก็บข้อมูล: ตารางคำสั่งซื้อ + รีวิวข้อความ + รูปสินค้า — จัดเป็นข้อมูลแบบใด",c:["Structured ล้วน","Unstructured ล้วน","ผสมทั้ง Structured + Unstructured","ไม่ใช่ข้อมูลทั้งคู่"],a:2},
{cat:"5v",q:"\"Variety\" ของ Big Data สื่อถึงอะไร",c:["ปริมาณข้อมูลมหาศาล","ข้อมูลมีหลายรูปแบบ/หลายแหล่ง (ข้อความ ภาพ เสียง log)","ข้อมูลไหลเร็ว","ข้อมูลมีคุณค่า"],a:1},

/* ===== wk2 · RDBMS + CREATE/INSERT + Primary Key (8) ===== */
{cat:"rdbms",q:"Primary Key มีคุณสมบัติใด",c:["ค่าซ้ำกันได้ และเป็นค่าว่าง (NULL) ได้","ค่าต้องไม่ซ้ำ และห้ามเป็น NULL","ต้องเป็นตัวเลขเท่านั้น","มีได้หลายคอลัมน์ที่ค่าซ้ำกัน"],a:1},
{cat:"rdbms",q:"คำสั่งใดใช้ \"สร้างตารางใหม่\"",c:["INSERT TABLE","CREATE TABLE","ADD TABLE","NEW TABLE"],a:1},
{cat:"rdbms",q:"คำสั่งใดใช้ \"เพิ่มข้อมูลลงในตาราง\"",c:["INSERT INTO","UPDATE INTO","ADD ROW","CREATE ROW"],a:0},
{cat:"rdbms",q:"RDBMS ย่อมาจากอะไร",c:["Rapid Database Management System","Relational Database Management System","Remote Data Backup Management System","Read-only Database Management Service"],a:1},
{cat:"rdbms",q:"ในตาราง products ควรเลือกคอลัมน์ใดเป็น Primary Key",c:["price (ราคา)","product_name (ชื่อสินค้า)","product_id (รหัสสินค้า ไม่ซ้ำ)","stock (จำนวนคงเหลือ)"],a:2},
{cat:"rdbms",q:"ข้อใดเขียน CREATE TABLE ได้ถูกต้อง",c:["CREATE TABLE customers (id INT PRIMARY KEY, name VARCHAR(50));","CREATE customers TABLE (id INT);","TABLE customers CREATE (id INT);","CREATE TABLE customers id INT, name VARCHAR;"],a:0},
{cat:"rdbms",q:"Foreign Key ทำหน้าที่อะไร",c:["ทำให้คอลัมน์ค่าไม่ซ้ำ","เชื่อมความสัมพันธ์ไปยัง Primary Key ของอีกตาราง","เข้ารหัสข้อมูล","เรียงลำดับข้อมูลอัตโนมัติ"],a:1},
{cat:"rdbms",q:"ชนิดข้อมูล (Data Type) ใดเหมาะกับเก็บ \"ราคาสินค้า ทศนิยม 2 ตำแหน่ง\"",c:["INT","VARCHAR","DECIMAL(10,2)","DATE"],a:2},

/* ===== wk3 · SELECT/WHERE/ORDER BY/LIKE/IN (12 · ทายผล) ===== */
{cat:"select",q:"products: (1,ปากกา,15) (2,ดินสอ,8) (3,ยางลบ,5) (4,ไม้บรรทัด,20)\nผลของ: SELECT name FROM products WHERE price > 10;",c:["ปากกา, ไม้บรรทัด","ดินสอ, ยางลบ","ปากกา, ดินสอ, ไม้บรรทัด","ทั้ง 4 แถว"],a:0},
{cat:"select",q:"products: (1,ปากกา,15) (2,ดินสอ,8) (3,ยางลบ,5)\nผลของ: SELECT COUNT(*) FROM products WHERE price < 10;",c:["1","2","3","0"],a:1},
{cat:"select",q:"คำสั่ง ORDER BY price DESC ให้ผลเรียงอย่างไร",c:["ราคาจากน้อยไปมาก","ราคาจากมากไปน้อย","เรียงตามชื่อ A-Z","สุ่มลำดับ"],a:1},
{cat:"select",q:"products(price): 15, 8, 5, 20\nผลของ: SELECT name FROM products ORDER BY price ASC LIMIT 1; (ชื่อเรียงตามราคา)",c:["สินค้าราคา 20","สินค้าราคา 5","สินค้าราคา 15","ทุกสินค้า"],a:1},
{cat:"select",q:"WHERE city IN ('กรุงเทพ','ภูเก็ต') หมายความว่าอย่างไร",c:["city ต้องเป็นทั้งกรุงเทพและภูเก็ตพร้อมกัน","city เป็นกรุงเทพ หรือ ภูเก็ต อย่างใดอย่างหนึ่ง","city ไม่ใช่กรุงเทพและภูเก็ต","city ขึ้นต้นด้วยกรุงเทพ"],a:1},
{cat:"select",q:"WHERE name LIKE 'ก%' จะดึงข้อมูลใด",c:["ชื่อที่มีตัว ก อยู่ตรงไหนก็ได้","ชื่อที่ขึ้นต้นด้วย ก","ชื่อที่ลงท้ายด้วย ก","ชื่อที่ยาวเท่ากับ ก"],a:1},
{cat:"select",q:"customers: (1,สมชาย,กรุงเทพ) (2,มานี,ภูเก็ต) (3,สมศรี,กรุงเทพ)\nผลของ: SELECT COUNT(*) FROM customers WHERE city='กรุงเทพ';",c:["1","2","3","0"],a:1},
{cat:"select",q:"เงื่อนไข WHERE price >= 10 AND price <= 20 เทียบเท่ากับข้อใด",c:["price BETWEEN 10 AND 20","price IN (10,20)","price LIKE '10-20'","price > 10 OR price < 20"],a:0},
{cat:"select",q:"products: (ปากกา,15) (ดินสอ,8) (ยางลบ,5) (สมุด,25)\nผลของ: SELECT COUNT(*) FROM products WHERE price>10 OR price<6;",c:["2","3","4","1"],a:1},
{cat:"select",q:"SELECT * FROM orders LIMIT 5; ให้ผลอย่างไร",c:["ดึงทุกแถว","ดึงแถวที่ order_id=5","ดึงมาแสดงไม่เกิน 5 แถวแรก","ดึงแถวที่ 5 แถวเดียว"],a:2},
{cat:"select",q:"customers(city): กรุงเทพ, ภูเก็ต, กรุงเทพ, เชียงใหม่\nผลของ: SELECT city FROM customers WHERE city <> 'กรุงเทพ';",c:["กรุงเทพ, กรุงเทพ","ภูเก็ต, เชียงใหม่","ทั้ง 4 แถว","ไม่มีผลลัพธ์"],a:1},
{cat:"select",q:"ต้องการดึงลูกค้าที่ \"ไม่ได้\" อยู่กรุงเทพและภูเก็ต ใช้เงื่อนไขใด",c:["city IN ('กรุงเทพ','ภูเก็ต')","city NOT IN ('กรุงเทพ','ภูเก็ต')","city = 'กรุงเทพ' AND city = 'ภูเก็ต'","city LIKE '%กรุงเทพ%'"],a:1},

/* ===== wk4 · JOIN + GROUP BY/HAVING + agg (12 · ทายผล) ===== */
{cat:"join",q:"INNER JOIN ระหว่าง 2 ตาราง ให้ผลอย่างไร",c:["ทุกแถวของตารางซ้าย แม้ไม่มีคู่","เฉพาะแถวที่มีคู่ตรงกันทั้งสองตาราง","ทุกแถวของตารางขวา แม้ไม่มีคู่","ผลคูณทุกแถวแบบไม่มีเงื่อนไข"],a:1},
{cat:"join",q:"orders มี 5 แถว · customers มี 3 แถว · มี order 1 แถวที่ customer_id ไม่มีในตาราง customers\nINNER JOIN ได้กี่แถว",c:["5","4","3","8"],a:1},
{cat:"join",q:"LEFT JOIN customers LEFT JOIN orders ให้ผลใด",c:["เฉพาะลูกค้าที่มีคำสั่งซื้อ","ลูกค้าทุกคน ถึงจะไม่มีคำสั่งซื้อ (ฝั่งที่ไม่มีคู่เป็น NULL)","เฉพาะคำสั่งซื้อที่มีลูกค้า","ผลคูณทุกแถว"],a:1},
{cat:"join",q:"orders(qty): 3, 5, 2, 4\nผลของ: SELECT SUM(qty) FROM orders;",c:["14","4","5","12"],a:0},
{cat:"join",q:"orders(qty): 3, 5, 2, 4\nผลของ: SELECT AVG(qty) FROM orders;",c:["4","3.5","14","2"],a:1},
{cat:"join",q:"GROUP BY ใช้ทำอะไร",c:["เรียงลำดับข้อมูล","จัดกลุ่มแถวที่มีค่าเหมือนกันเพื่อสรุปผล (เช่น นับ/รวม)","กรองแถวก่อนแสดง","ลบแถวซ้ำ"],a:1},
{cat:"join",q:"orders: ลูกค้า A สั่ง 2 ครั้ง, B สั่ง 1 ครั้ง, C สั่ง 3 ครั้ง\nSELECT customer, COUNT(*) FROM orders GROUP BY customer; ได้กี่แถว",c:["6 แถว","3 แถว","1 แถว","2 แถว"],a:1},
{cat:"join",q:"HAVING ต่างจาก WHERE อย่างไร",c:["HAVING กรองก่อนจัดกลุ่ม WHERE กรองหลังจัดกลุ่ม","WHERE กรองแถวก่อนจัดกลุ่ม HAVING กรองผลหลัง GROUP BY","ทั้งคู่เหมือนกันทุกกรณี","HAVING ใช้กับ INSERT เท่านั้น"],a:1},
{cat:"join",q:"ยอดขายต่อสินค้า: ปากกา 10, ดินสอ 3, ยางลบ 7\nSELECT name FROM ... GROUP BY name HAVING SUM(qty) > 5; ได้สินค้าใด",c:["ดินสอ","ปากกา, ยางลบ","ทั้ง 3 สินค้า","ไม่มี"],a:1},
{cat:"join",q:"SELECT MAX(price) FROM products; คืนค่าใด เมื่อ price = 15,8,5,20",c:["5","20","48","12"],a:1},
{cat:"join",q:"COUNT(*) ต่างจาก COUNT(city) อย่างไร เมื่อ city มีค่า NULL บางแถว",c:["เหมือนกันทุกกรณี","COUNT(*) นับทุกแถว · COUNT(city) ไม่นับแถวที่ city เป็น NULL","COUNT(*) ไม่นับ NULL · COUNT(city) นับ NULL","ทั้งคู่ไม่นับ NULL"],a:1},
{cat:"join",q:"orders ต่อ products ด้วย product_id เพื่อแสดง \"ชื่อสินค้า\" ในรายงานยอดขาย ควรใช้คำสั่งใด",c:["UNION","JOIN ... ON orders.product_id = products.product_id","WHERE products = orders","GROUP BY product_id เท่านั้น"],a:1},

/* ===== wk5 · Data Quality (10) ===== */
{cat:"quality",q:"มิติคุณภาพข้อมูล \"Completeness\" หมายถึงอะไร",c:["ข้อมูลถูกต้องตรงความจริง","ข้อมูลครบถ้วน ไม่มีค่าที่ขาดหาย (Missing)","ข้อมูลทันสมัยเป็นปัจจุบัน","ข้อมูลสอดคล้องกันทุกที่"],a:1},
{cat:"quality",q:"คอลัมน์ phone มีบางแถวเป็นค่าว่าง (NULL) — เป็นปัญหาคุณภาพมิติใด",c:["Accuracy","Completeness","Timeliness","Consistency"],a:1},
{cat:"quality",q:"ลูกค้าคนเดียวมีข้อมูล 2 แถว (ชื่อซ้ำ) — เรียกว่าปัญหาใด",c:["Missing Data","Duplicate Data","Outlier","Encryption"],a:1},
{cat:"quality",q:"อายุลูกค้าบางแถวเป็น 250 ปี — จัดเป็นปัญหาใด",c:["Duplicate","Outlier (ค่าผิดปกติ)","Missing","Consistency"],a:1},
{cat:"quality",q:"มิติ \"Consistency\" หมายถึงอะไร",c:["ข้อมูลครบทุกช่อง","ข้อมูลเดียวกันสอดคล้องกันทุกที่ ไม่ขัดแย้ง (เช่นเพศบันทึกรูปแบบเดียว)","ข้อมูลใหม่ล่าสุด","ข้อมูลไม่ซ้ำ"],a:1},
{cat:"quality",q:"ที่อยู่ลูกค้าบันทึกไว้เมื่อ 5 ปีก่อน ปัจจุบันย้ายแล้ว — ปัญหามิติใด",c:["Completeness","Accuracy","Timeliness (ความทันสมัย)","Duplicate"],a:2},
{cat:"quality",q:"คอลัมน์ gender มีค่า 'M','ชาย','Male','ช' ปนกัน — ปัญหามิติใด",c:["Consistency (ความสอดคล้องของรูปแบบ)","Completeness","Outlier","Timeliness"],a:0},
{cat:"quality",q:"\"Accuracy\" (ความถูกต้อง) ของข้อมูลหมายถึงอะไร",c:["ข้อมูลครบทุกแถว","ข้อมูลตรงกับความเป็นจริง ไม่ผิดเพี้ยน","ข้อมูลไม่ซ้ำ","ข้อมูลอัปเดตล่าสุด"],a:1},
{cat:"quality",q:"วิธีตรวจหา Duplicate ในตารางด้วย SQL ที่เหมาะสมที่สุดคือข้อใด",c:["SELECT * ทุกแถวแล้วดูเอง","GROUP BY คอลัมน์ที่ควรไม่ซ้ำ HAVING COUNT(*) > 1","DELETE ทุกแถว","ORDER BY แล้วนับมือ"],a:1},
{cat:"quality",q:"เหตุใดต้องตรวจคุณภาพข้อมูล \"ก่อน\" นำไปวิเคราะห์",c:["เพื่อให้ไฟล์เล็กลง","เพราะข้อมูลคุณภาพต่ำทำให้ผลวิเคราะห์ผิดพลาด (Garbage In Garbage Out)","เพื่อความสวยงาม","เพื่อเข้ารหัสข้อมูล"],a:1},

/* ===== wk6 · Data Cleaning (10 · บางข้อทายผล) ===== */
{cat:"clean",q:"คำสั่งใดใช้ \"แก้ไขข้อมูลที่มีอยู่แล้ว\" ในตาราง",c:["INSERT","UPDATE","SELECT","CREATE"],a:1},
{cat:"clean",q:"คำสั่งใดใช้ \"ลบแถวข้อมูล\"",c:["DROP","DELETE","REMOVE","CLEAR"],a:1},
{cat:"clean",q:"UPDATE customers SET city='กรุงเทพ' WHERE city='กทม'; ทำอะไร",c:["ลบแถวที่ city เป็น กทม","เปลี่ยนค่า กทม ให้เป็น กรุงเทพ (ทำให้สอดคล้อง)","เพิ่มแถวใหม่","สร้างคอลัมน์ใหม่"],a:1},
{cat:"clean",q:"กลยุทธ์จัดการ Missing Data ข้อใด \"ไม่ใช่\" วิธีที่นิยม",c:["ลบแถวที่ขาดข้อมูล","เติมด้วยค่าเฉลี่ย/ค่าที่พบบ่อย","ปล่อยข้อมูลเสียไว้แล้วเข้ารหัสทับ","เติมด้วยค่าที่กำหนด เช่น 'ไม่ระบุ'"],a:2},
{cat:"clean",q:"DELETE FROM orders WHERE qty = 0; ทำอะไร",c:["ตั้ง qty ทุกแถวเป็น 0","ลบเฉพาะแถวที่ qty เท่ากับ 0","ลบทุกแถวในตาราง","เพิ่มแถว qty=0"],a:1},
{cat:"clean",q:"คำเตือนสำคัญเมื่อใช้ DELETE/UPDATE คือข้อใด",c:["ต้องใส่ ORDER BY เสมอ","ถ้าลืม WHERE จะกระทบ \"ทุกแถว\" ในตาราง","ต้องใช้กับ JOIN เท่านั้น","ใช้ได้เฉพาะตารางว่าง"],a:1},
{cat:"clean",q:"การ \"แปลงรูปแบบ (Standardize)\" วันที่ '1/2/2024' และ '2024-02-01' ให้เป็นรูปแบบเดียวกัน แก้ปัญหามิติใด",c:["Completeness","Consistency","Outlier","Duplicate"],a:1},
{cat:"clean",q:"ต้องการลบแถวซ้ำ โดยเก็บไว้ 1 แถว ขั้นตอนที่เหมาะสมคือข้อใด",c:["DROP TABLE แล้วสร้างใหม่","ระบุแถวซ้ำ (GROUP BY ... HAVING COUNT>1) แล้ว DELETE ให้เหลือ 1","SELECT * เฉยๆ","UPDATE ทุกแถวให้เหมือนกัน"],a:1},
{cat:"clean",q:"customers: (1,สมชาย) (2,สมชาย) (3,มานี) · หลังลบ Duplicate ชื่อ ให้เหลือไม่ซ้ำ จะเหลือกี่แถว",c:["3 แถว","2 แถว","1 แถว","0 แถว"],a:1},
{cat:"clean",q:"เหตุใดควร \"สำรองข้อมูล (Backup) ก่อน\" ทำ Data Cleaning ด้วย DELETE/UPDATE",c:["ทำให้คำสั่งทำงานเร็วขึ้น","เผื่อลบ/แก้ผิดพลาด จะกู้ข้อมูลกลับได้","เพื่อให้ไฟล์ใหญ่ขึ้น","เป็นข้อบังคับของ SELECT"],a:1}
];
