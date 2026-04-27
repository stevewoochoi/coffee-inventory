package com.coffee.config;

import com.fasterxml.jackson.databind.DeserializationFeature;
import org.springframework.boot.autoconfigure.jackson.Jackson2ObjectMapperBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class JacksonConfig {

    @Bean
    public Jackson2ObjectMapperBuilderCustomizer jacksonCustomizer() {
        return builder -> builder.featuresToEnable(
                DeserializationFeature.FAIL_ON_NULL_FOR_PRIMITIVES
        ).postConfigurer(mapper ->
                mapper.configure(DeserializationFeature.ACCEPT_FLOAT_AS_INT, false)
        );
    }
}
