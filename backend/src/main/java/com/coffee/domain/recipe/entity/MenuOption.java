package com.coffee.domain.recipe.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "menu_option")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class MenuOption {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "menu_id", nullable = false)
    private Long menuId;

    @Column(nullable = false, length = 100)
    private String name;
}
