package com.example.back_end.modules.messages.service;

import com.example.back_end.modules.messages.dto.UserBasicDTO;
import com.example.back_end.modules.user.entity.User;
import com.example.back_end.modules.user.entity.Role;
import com.example.back_end.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MessageService {

    private final UserRepository userRepository;
    
    public List<UserBasicDTO> getAvailableRecipients() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String currentUserRole = auth.getAuthorities().stream()
                .findFirst()
                .map(GrantedAuthority::getAuthority)
                .orElse("");

        List<Role> allowedRoles = getAllowedRolesForCurrentUser(currentUserRole);

        return userRepository.findByRoleIn(allowedRoles)
                .stream()
                .filter(User::isActive)
                .map(this::convertToUserBasicDTO)
                .collect(Collectors.toList());
    }

    private List<Role> getAllowedRolesForCurrentUser(String currentUserRole) {
        return switch (currentUserRole) {
            case "ROLE_CEO", "CEO" -> List.of(Role.STORE_MANAGER, Role.INVENTORY_MANAGER);
            case "ROLE_STORE_MANAGER", "STORE_MANAGER" -> List.of(Role.CEO, Role.INVENTORY_MANAGER);
            case "ROLE_INVENTORY_MANAGER", "INVENTORY_MANAGER" -> List.of(Role.CEO, Role.STORE_MANAGER);
            default -> List.of();
        };
    }

    private UserBasicDTO convertToUserBasicDTO(User user) {
        UserBasicDTO dto = new UserBasicDTO();
        dto.setId(user.getId());
        dto.setFirstName(user.getFirstName());
        dto.setLastName(user.getLastName());
        dto.setEmail(user.getEmail());
        dto.setRole(user.getRole().name());
        return dto;
    }

    public Long getUnreadCount() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        Long currentUserId = getCurrentUserId(auth);
        return messageRepository.countUnreadMessagesByToUserId(currentUserId);
    }
}

