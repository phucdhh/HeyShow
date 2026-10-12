// Danh sách toàn bộ danh mục của trang /templates, theo đúng thứ tự hiển thị:
// hết "Mẫu bài trình chiếu" (kind deck) rồi mới đến "Mẫu slide" (kind slide) —
// test trong server/test/api.test.js chốt thứ tự đó vì trang chỉ in một nhãn mỗi khi kind đổi.
// Thêm danh mục mới: tạo file trong thư mục này rồi nối vào mảng CATEGORIES.

import * as GIAOAN from './giaoan.js';
import * as CHUYENDE from './chuyende.js';
import * as QUYTRINH from './quytrinh.js';
import * as HOATDONG from './hoatdong.js';
import * as BAOCAO from './baocao.js';
import * as HIEUUNG from './hieuung.js';
import * as MODAU from './modau.js';
import * as SOLIEU from './solieu.js';
import * as BOCUC from './bocuc.js';
import * as TUONGTAC from './tuongtac.js';

// Nền sáng là quy ước của cả kho mẫu, dù theme Reveal nạp kèm là black: section-master
// phải phủ .reveal background bằng gradient nhạt, và màu đề mục phải !important vì theme
// ép #222 cho mọi section có data-background-* sáng (rule section.has-light-background).
export const CATEGORIES = [
    GIAOAN,
    CHUYENDE,
    QUYTRINH,
    HOATDONG,
    BAOCAO,
    HIEUUNG,
    MODAU,
    SOLIEU,
    BOCUC,
    TUONGTAC,
];
