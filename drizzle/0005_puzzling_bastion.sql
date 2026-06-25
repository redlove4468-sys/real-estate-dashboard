CREATE TABLE `client_recommend` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`kwonriId` int,
	`rdbClientIndex` varchar(20),
	`rdbKwonriIndex` varchar(20),
	`itemType` varchar(50),
	`memo` text,
	`note` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `client_recommend_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `client_work` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`rdbIndex` varchar(20),
	`workDate` timestamp,
	`content` text,
	`manager` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `client_work_id` PRIMARY KEY(`id`)
);
