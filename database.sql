
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;


CREATE TABLE `user_data` (
                             `uid` int(255) NOT NULL,
                             `shop_url` varchar(500) NOT NULL,
                             `session_id` varchar(255) NOT NULL,
                             `domain_id` varchar(500) NOT NULL,
                             `access_token` varchar(255) NOT NULL,
                             `offline_access_token` varchar(255) NOT NULL,
                             `state` varchar(255) NOT NULL,
                             `is_online` varchar(255) NOT NULL,
                             `online_access_info` varchar(5000) NOT NULL,
                             `scope` varchar(500) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;


ALTER TABLE `user_data`
    ADD PRIMARY KEY (`uid`),
    ADD UNIQUE KEY `shop_url` (`shop_url`);


ALTER TABLE `user_data`
    MODIFY `uid` int(255) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1312;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
