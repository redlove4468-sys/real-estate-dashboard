CREATE TABLE `kwonri_work` (
	`id` int AUTO_INCREMENT NOT NULL,
	`kwonriId` int NOT NULL,
	`rdbIndex` varchar(20),
	`workDate` timestamp,
	`content` text,
	`manager` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `kwonri_work_id` PRIMARY KEY(`id`)
);
