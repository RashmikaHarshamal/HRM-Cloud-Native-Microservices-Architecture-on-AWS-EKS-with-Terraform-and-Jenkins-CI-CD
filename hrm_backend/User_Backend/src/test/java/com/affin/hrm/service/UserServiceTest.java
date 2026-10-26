package com.airella.hrm.service;

import com.airella.hrm.DTO.LoginDTO;
import com.airella.hrm.DTO.UserDTO;
import com.airella.hrm.Model.User;
import com.airella.hrm.Repo.UserRepo;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.modelmapper.ModelMapper;
import org.mockito.ArgumentCaptor;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class UserServiceTest {

    private UserRepo userRepo;
    private UserService service;

    @BeforeEach
    void setUp() {
        userRepo = mock(UserRepo.class);
        service = new UserService();
        ReflectionTestUtils.setField(service, "userRepo", userRepo);
        ReflectionTestUtils.setField(service, "modelMapper", new ModelMapper());
    }

    private User user(int id, String name, String email, String password) {
        User u = new User();
        u.setId(id);
        u.setFullName(name);
        u.setEmail(email);
        u.setPassword(password);
        u.setRole("EMPLOYEE");
        return u;
    }

    @Test
    void getAllUsers_mapsEveryUser() {
        when(userRepo.findAll()).thenReturn(List.of(
                user(1, "Alice", "alice@acme.test", "pw1"),
                user(2, "Bob", "bob@acme.test", "pw2")));

        List<UserDTO> result = service.getAllUsers();

        assertEquals(2, result.size());
        assertEquals("Alice", result.get(0).getFullName());
        assertEquals("bob@acme.test", result.get(1).getEmail());
        assertEquals(2, result.get(1).getId());
    }

    @Test
    void getAllUsers_emptyRepository_returnsEmptyList() {
        when(userRepo.findAll()).thenReturn(List.of());

        assertTrue(service.getAllUsers().isEmpty());
    }

    @Test
    void getUserById_found_returnsMappedDto() {
        when(userRepo.getUserById(7)).thenReturn(user(7, "Carol", "carol@acme.test", "pw"));

        UserDTO dto = service.getUserById(7);

        assertEquals(7, dto.getId());
        assertEquals("Carol", dto.getFullName());
        assertEquals("EMPLOYEE", dto.getRole());
    }

    @Test
    void getUserById_notFound_throwsNullPointerWithMessage() {
        when(userRepo.getUserById(99)).thenReturn(null);

        NullPointerException ex = assertThrows(NullPointerException.class, () -> service.getUserById(99));

        assertEquals("User not found", ex.getMessage());
    }

    @Test
    void saveUser_persistsMappedEntityAndReturnsSameDto() {
        UserDTO dto = new UserDTO();
        dto.setId(1);
        dto.setFullName("Dave");
        dto.setEmail("dave@acme.test");
        dto.setRole("ADMIN");

        UserDTO result = service.saveUser(dto);

        assertSame(dto, result);
        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepo).save(captor.capture());
        assertEquals("Dave", captor.getValue().getFullName());
        assertEquals("dave@acme.test", captor.getValue().getEmail());
        assertEquals("ADMIN", captor.getValue().getRole());
    }

    @Test
    void updateUser_persistsMappedEntityAndReturnsSameDto() {
        UserDTO dto = new UserDTO();
        dto.setId(3);
        dto.setFullName("Erin");
        dto.setEmail("erin@acme.test");

        UserDTO result = service.updateUser(dto);

        assertSame(dto, result);
        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepo).save(captor.capture());
        assertEquals(3, captor.getValue().getId());
        assertEquals("Erin", captor.getValue().getFullName());
    }

    @Test
    void deleteUser1_deletesById() {
        String message = service.deleteUser1(5);

        verify(userRepo).deleteById(5);
        assertEquals("User deleted1", message);
    }

    @Test
    void deleteUser2_deletesMappedEntity() {
        UserDTO dto = new UserDTO();
        dto.setId(8);
        dto.setEmail("frank@acme.test");

        String message = service.deleteUser2(dto);

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepo).delete(captor.capture());
        assertEquals(8, captor.getValue().getId());
        assertEquals("frank@acme.test", captor.getValue().getEmail());
        assertEquals("User deleted2", message);
    }

    @Test
    void loginUser_correctPassword_returnsUserDto() {
        when(userRepo.findByEmail("gina@acme.test"))
                .thenReturn(Optional.of(user(4, "Gina", "gina@acme.test", "secret")));

        UserDTO dto = service.loginUser(new LoginDTO("gina@acme.test", "secret"));

        assertEquals(4, dto.getId());
        assertEquals("Gina", dto.getFullName());
    }

    @Test
    void loginUser_wrongPassword_throwsInvalidCredentials() {
        when(userRepo.findByEmail("gina@acme.test"))
                .thenReturn(Optional.of(user(4, "Gina", "gina@acme.test", "secret")));

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> service.loginUser(new LoginDTO("gina@acme.test", "wrong")));

        assertEquals("Invalid email or password", ex.getMessage());
    }

    @Test
    void loginUser_passwordIsCaseSensitive() {
        when(userRepo.findByEmail("gina@acme.test"))
                .thenReturn(Optional.of(user(4, "Gina", "gina@acme.test", "Secret")));

        assertThrows(RuntimeException.class,
                () -> service.loginUser(new LoginDTO("gina@acme.test", "secret")));
    }

    @Test
    void loginUser_unknownEmail_throwsSameMessage() {
        when(userRepo.findByEmail("nobody@acme.test")).thenReturn(Optional.empty());

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> service.loginUser(new LoginDTO("nobody@acme.test", "x")));

        assertEquals("Invalid email or password", ex.getMessage());
    }
}
