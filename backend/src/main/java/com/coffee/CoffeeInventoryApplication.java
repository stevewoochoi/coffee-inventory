package com.coffee;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class CoffeeInventoryApplication {

    public static void main(String[] args) {
        SpringApplication.run(CoffeeInventoryApplication.class, args);
    }
}
