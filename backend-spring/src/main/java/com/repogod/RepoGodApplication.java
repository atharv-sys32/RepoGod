package com.repogod;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class RepoGodApplication {

    public static void main(String[] args) {
        SpringApplication.run(RepoGodApplication.class, args);
    }
}
