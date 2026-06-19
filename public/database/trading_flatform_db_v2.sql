-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Jun 19, 2026 at 09:30 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.1.25

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `trading_flatform_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `user`
--

CREATE TABLE `user` (
  `id` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `description` varchar(191) DEFAULT NULL,
  `startingBalance` decimal(18,2) NOT NULL,
  `currentBalance` decimal(18,2) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `strategyId` varchar(191) DEFAULT NULL,
  `status` int(11) NOT NULL DEFAULT 1,
  `avatar` varchar(191) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `user`
--

INSERT INTO `user` (`id`, `name`, `description`, `startingBalance`, `currentBalance`, `createdAt`, `strategyId`, `status`, `avatar`) VALUES
('cmpy7mli70006twx0c0r8j7tc', 'Demo Trader 2', 'tạo thử', 100000.00, 100000.00, '2026-06-03 22:17:10.108', 'cmqj4kh4v0001tw50knl8zm3p', 0, NULL),
('cmqki8aod0002tws8bq77lgl5', 'Safe Trader 1 (3%)', 'Bảo toàn vốn - Giao dịch nhiều - Drawdown thấp', 3846.15, 51.04, '2026-06-19 12:44:54.540', 'cmqki8aoa0000tws8d2joz9l3', 1, '/api/storage/avatars/1de3f46f-04d4-4d51-998b-0cbd07f1cb6a.png'),
('cmqkiks6p0019tws8raiphfcd', 'Aggressive Trader 1 (Max %)', 'Bắt trend Lợi nhuận cao - Chấp nhận thua nhiều hơn', 3846.15, 76.25, '2026-06-19 12:54:37.104', 'cmqkiks6l0017tws8a4prsb8s', 1, '/api/storage/avatars/5792a65a-8f82-4ef4-a726-b810d9b81926.png'),
('cmqkiv6v4002gtws83maphmgo', 'Momentum Trader 1', 'Mua coin đang mạnh nhất thị trường (Coin mạnh thường tiếp tục mạnh)', 3846.15, 3846.15, '2026-06-19 13:02:42.687', 'cmqkiv6us002etws8iq07u9x0', 1, '/api/storage/avatars/4f29aa1f-4d16-4a23-a477-22070c591b98.jpg'),
('cmqkiyv1o002jtws8oy4d9xjy', 'Dip Buyer 1', 'Mua coin tốt đang điều chỉnh (Mua điều chỉnh trong xu hướng tăng)', 3846.15, 57.26, '2026-06-19 13:05:33.995', 'cmqkiyv1m002htws8seejwuf2', 1, '/api/storage/avatars/66afd303-1d17-451e-b14e-ed5c5c96de5d.png'),
('cmqkj5n4p003qtws8cqt6sop1', 'Volume Hunter', 'Chỉ quan tâm tiền lớn đang vào (Tiền đi đâu thì đi theo đó)', 3846.15, 3846.15, '2026-06-19 13:10:50.327', 'cmqkj5n4b003otws8gddto3vd', 1, '/api/storage/avatars/1eb092f2-753a-4088-9b9a-a6143bc3e4bd.jpg'),
('demo-user', 'Demo Trader 1', 'Paper trading account seeded for MVP testing.', 100000.00, 18089.21, '2026-06-03 20:59:49.561', 'cmqj4jwl90000tw50aqe39f5m', 0, NULL);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `user`
--
ALTER TABLE `user`
  ADD PRIMARY KEY (`id`),
  ADD KEY `User_strategyId_idx` (`strategyId`);

--
-- Constraints for dumped tables
--

--
-- Constraints for table `user`
--
ALTER TABLE `user`
  ADD CONSTRAINT `User_strategyId_fkey` FOREIGN KEY (`strategyId`) REFERENCES `strategy` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
