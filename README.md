# Movie Ticket Booking System

Website đặt vé xem phim với chức năng xem suất chiếu, chọn ghế và mô phỏng thanh toán.

## Công nghệ
- Node.js, Express
- MySQL, phpMyAdmin
- Nginx
- Prometheus, Node Exporter
- Grafana, Loki, Grafana Alloy, LogQL
- Git và GitHub

## Chức năng
- Xem phim và suất chiếu.
- Xem sơ đồ ghế và trạng thái ghế.
- Đặt vé và kiểm soát ghế đã đặt.
- Mô phỏng thanh toán.
- Lưu thông tin đặt vé trong MySQL.

## Địa chỉ dịch vụ
- Website: http://localhost/
- phpMyAdmin: http://localhost/phpmyadmin/
- Grafana: http://localhost:3000/
- Prometheus: http://localhost:9090/
- Loki: http://localhost:3100/ready

## Cài đặt
1. Cài Node.js và MySQL phù hợp với môi trường.
2. Cài các gói phụ thuộc bằng `npm install`.
3. Cấu hình thông tin kết nối trong file `.env`.
4. Xem các lệnh chạy được hỗ trợ bằng `npm run`.
5. Khởi động ứng dụng theo script được khai báo trong `package.json`.

## LogQL mẫu
Xem log ứng dụng:

    {job="movie-ticket-app"}

Lọc log có nội dung khởi động:

    {job="movie-ticket-app"} |= "Movie Ticket System"

## GitHub
https://github.com/dtc245180011-hue/movie-ticket-system

## Lưu ý bảo mật
- Thanh toán chỉ là mô phỏng.
- Không đưa file `.env`, mật khẩu hoặc khóa riêng lên GitHub.
- Không đưa log runtime và file backup lên GitHub.
- Dashboard và datasource Grafana phụ thuộc vào cấu hình môi trường.
