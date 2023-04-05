/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

DROP DATABASE IF EXISTS `lingua_bot`;
CREATE DATABASE IF NOT EXISTS `lingua_bot` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin */;
USE `lingua_bot`;

DROP TABLE IF EXISTS `home_work_entries`;
CREATE TABLE IF NOT EXISTS `home_work_entries` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `studyGroupId` int(10) unsigned NOT NULL,
  `chatId` bigint(20) NOT NULL DEFAULT '0',
  `messageId` bigint(20) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `FK_home_work_entries_study_groups` (`studyGroupId`),
  CONSTRAINT `FK_home_work_entries_study_groups` FOREIGN KEY (`studyGroupId`) REFERENCES `study_groups` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

DROP TABLE IF EXISTS `settings`;
CREATE TABLE IF NOT EXISTS `settings` (
  `id` tinyint(4) NOT NULL,
  `adminTgChatId` bigint(20) NOT NULL DEFAULT '0',
  `mainTgBotToken` varchar(255) COLLATE utf8mb4_bin NOT NULL DEFAULT '',
  `homeWorkTgChannelId` bigint(20) NOT NULL DEFAULT '0',
  `displayTimeZone` varchar(128) COLLATE utf8mb4_bin NOT NULL DEFAULT 'Asia/Almaty',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

DROP TABLE IF EXISTS `study_groups`;
CREATE TABLE IF NOT EXISTS `study_groups` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(256) COLLATE utf8mb4_bin NOT NULL DEFAULT '',
  `lastTimeSetHomeWork` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

DROP TABLE IF EXISTS `users`;
CREATE TABLE IF NOT EXISTS `users` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `lang` tinyint(3) unsigned NOT NULL DEFAULT '0',
  `tgid` bigint(20) unsigned NOT NULL DEFAULT '0',
  `name` varchar(256) COLLATE utf8mb4_bin NOT NULL DEFAULT '',
  `studyGroupId` int(10) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tgid` (`tgid`),
  KEY `FK_users_study_groups` (`studyGroupId`),
  CONSTRAINT `FK_users_study_groups` FOREIGN KEY (`studyGroupId`) REFERENCES `study_groups` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

DROP TABLE IF EXISTS `words`;
CREATE TABLE IF NOT EXISTS `words` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `wordsCollectionId` int(10) unsigned NOT NULL,
  `photo` varchar(255) COLLATE utf8mb4_bin NOT NULL DEFAULT '',
  `word` varchar(255) COLLATE utf8mb4_bin NOT NULL DEFAULT '',
  `hint` varchar(1024) COLLATE utf8mb4_bin NOT NULL DEFAULT '',
  `repeatedCount` mediumint(8) unsigned NOT NULL DEFAULT '0',
  `repeating` tinyint(3) unsigned NOT NULL DEFAULT '1',
  `created` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FK_words_words_collections` (`wordsCollectionId`),
  KEY `word` (`word`),
  CONSTRAINT `FK_words_words_collections` FOREIGN KEY (`wordsCollectionId`) REFERENCES `words_collections` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

DROP TABLE IF EXISTS `words_collections`;
CREATE TABLE IF NOT EXISTS `words_collections` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `userId` int(10) unsigned DEFAULT NULL,
  `name` varchar(255) COLLATE utf8mb4_bin NOT NULL DEFAULT '0',
  `isCommon` tinyint(3) unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `FK_words_collections_users` (`userId`),
  CONSTRAINT `FK_words_collections_users` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
