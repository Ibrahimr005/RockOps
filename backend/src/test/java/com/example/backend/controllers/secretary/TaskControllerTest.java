package com.example.backend.controllers.secretary;

import com.example.backend.config.JwtService;
import com.example.backend.models.secretary.Task;
import com.example.backend.models.secretary.TaskPriority;
import com.example.backend.models.secretary.TaskStatus;
import com.example.backend.services.secretary.TaskService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willDoNothing;
import static org.mockito.BDDMockito.willThrow;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = TaskController.class)
@AutoConfigureMockMvc(addFilters = false)
public class TaskControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private TaskService taskService;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private UserDetailsService userDetailsService;

    @Autowired
    private ObjectMapper objectMapper;

    private Task sampleTask;
    private UUID taskId;
    private UUID secretaryId;
    private UUID userId;

    @BeforeEach
    void setUp() {
        objectMapper.registerModule(new JavaTimeModule());

        taskId = UUID.randomUUID();
        secretaryId = UUID.randomUUID();
        userId = UUID.randomUUID();

        sampleTask = Task.builder()
                .id(taskId)
                .title("Review contract documents")
                .description("Review and summarize Q1 contracts")
                .status(TaskStatus.PENDING)
                .priority(TaskPriority.HIGH)
                .dueDate(LocalDateTime.now().plusDays(3))
                .createdAt(LocalDateTime.now())
                .notes("Urgent")
                .build();
    }

    // ==================== POST /api/v1/tasks ====================

    @Test
    @WithMockUser
    void createTask_shouldReturn201WithCreatedTask() throws Exception {
        Map<String, Object> body = Map.of(
                "title", "Review contract documents",
                "description", "Review and summarize Q1 contracts",
                "priority", "HIGH",
                "dueDate", "2026-03-20T10:00:00"
        );

        given(taskService.createTask(anyMap(), eq(secretaryId))).willReturn(sampleTask);

        mockMvc.perform(MockMvcRequestBuilders
                        .post("/api/v1/tasks")
                        .param("secretaryId", secretaryId.toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(taskId.toString()))
                .andExpect(jsonPath("$.title").value("Review contract documents"))
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.priority").value("HIGH"));
    }

    // ==================== GET /api/v1/tasks ====================

    @Test
    @WithMockUser
    void getAllTasks_shouldReturn200WithList() throws Exception {
        given(taskService.getAllTasks()).willReturn(List.of(sampleTask));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/tasks")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].id").value(taskId.toString()))
                .andExpect(jsonPath("$[0].title").value("Review contract documents"));
    }

    @Test
    @WithMockUser
    void getAllTasks_emptyList_shouldReturn200() throws Exception {
        given(taskService.getAllTasks()).willReturn(Collections.emptyList());

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/tasks")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }

    // ==================== GET /api/v1/tasks/{id} ====================

    @Test
    @WithMockUser
    void getTaskById_shouldReturn200WithTask() throws Exception {
        given(taskService.getTaskById(taskId)).willReturn(sampleTask);

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/tasks/{id}", taskId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(taskId.toString()))
                .andExpect(jsonPath("$.title").value("Review contract documents"))
                .andExpect(jsonPath("$.status").value("PENDING"));
    }

    // ==================== GET /api/v1/tasks/user/{userId} ====================

    @Test
    @WithMockUser
    void getTasksByUser_shouldReturn200WithList() throws Exception {
        given(taskService.getTasksByAssignedUser(userId)).willReturn(List.of(sampleTask));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/tasks/user/{userId}", userId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].id").value(taskId.toString()));
    }

    @Test
    @WithMockUser
    void getTasksByUser_noTasks_shouldReturn200EmptyList() throws Exception {
        given(taskService.getTasksByAssignedUser(userId)).willReturn(Collections.emptyList());

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/tasks/user/{userId}", userId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }

    // ==================== GET /api/v1/tasks/status/{status} ====================

    @Test
    @WithMockUser
    void getTasksByStatus_shouldReturn200WithList() throws Exception {
        given(taskService.getTasksByStatus(TaskStatus.PENDING)).willReturn(List.of(sampleTask));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/tasks/status/{status}", TaskStatus.PENDING)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].status").value("PENDING"));
    }

    @Test
    @WithMockUser
    void getTasksByStatus_completedStatus_shouldReturn200() throws Exception {
        Task completedTask = Task.builder()
                .id(UUID.randomUUID())
                .title("Archived task")
                .status(TaskStatus.COMPLETED)
                .priority(TaskPriority.LOW)
                .dueDate(LocalDateTime.now().minusDays(1))
                .createdAt(LocalDateTime.now().minusDays(5))
                .build();

        given(taskService.getTasksByStatus(TaskStatus.COMPLETED)).willReturn(List.of(completedTask));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/tasks/status/{status}", TaskStatus.COMPLETED)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].status").value("COMPLETED"));
    }

    // ==================== GET /api/v1/tasks/user/{userId}/status/{status} ====================

    @Test
    @WithMockUser
    void getTasksByUserAndStatus_shouldReturn200WithFilteredList() throws Exception {
        given(taskService.getTasksByUserAndStatus(userId, TaskStatus.IN_PROGRESS))
                .willReturn(List.of(sampleTask));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/tasks/user/{userId}/status/{status}", userId, TaskStatus.IN_PROGRESS)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].id").value(taskId.toString()));
    }

    @Test
    @WithMockUser
    void getTasksByUserAndStatus_noMatches_shouldReturn200EmptyList() throws Exception {
        given(taskService.getTasksByUserAndStatus(userId, TaskStatus.CANCELLED))
                .willReturn(Collections.emptyList());

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/tasks/user/{userId}/status/{status}", userId, TaskStatus.CANCELLED)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());
    }

    // ==================== PUT /api/v1/tasks/{id} ====================

    @Test
    @WithMockUser
    void updateTask_shouldReturn200WithUpdatedTask() throws Exception {
        Task updatedTask = Task.builder()
                .id(taskId)
                .title("Updated title")
                .description("Updated description")
                .status(TaskStatus.IN_PROGRESS)
                .priority(TaskPriority.MEDIUM)
                .dueDate(LocalDateTime.now().plusDays(7))
                .createdAt(LocalDateTime.now().minusDays(1))
                .updatedAt(LocalDateTime.now())
                .build();

        Map<String, Object> body = Map.of(
                "title", "Updated title",
                "description", "Updated description",
                "priority", "MEDIUM"
        );

        given(taskService.updateTask(eq(taskId), anyMap())).willReturn(updatedTask);

        mockMvc.perform(MockMvcRequestBuilders
                        .put("/api/v1/tasks/{id}", taskId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(taskId.toString()))
                .andExpect(jsonPath("$.title").value("Updated title"))
                .andExpect(jsonPath("$.status").value("IN_PROGRESS"));
    }

    // ==================== PATCH /api/v1/tasks/{id}/status ====================

    @Test
    @WithMockUser
    void updateTaskStatus_shouldReturn200WithUpdatedTask() throws Exception {
        Task inProgressTask = Task.builder()
                .id(taskId)
                .title("Review contract documents")
                .status(TaskStatus.IN_PROGRESS)
                .priority(TaskPriority.HIGH)
                .dueDate(LocalDateTime.now().plusDays(3))
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        Map<String, String> body = Map.of("status", "IN_PROGRESS");

        given(taskService.updateTaskStatus(eq(taskId), eq(TaskStatus.IN_PROGRESS)))
                .willReturn(inProgressTask);

        mockMvc.perform(MockMvcRequestBuilders
                        .patch("/api/v1/tasks/{id}/status", taskId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(taskId.toString()))
                .andExpect(jsonPath("$.status").value("IN_PROGRESS"));
    }

    @Test
    @WithMockUser
    void updateTaskStatus_toCancelled_shouldReturn200() throws Exception {
        Task cancelledTask = Task.builder()
                .id(taskId)
                .title("Review contract documents")
                .status(TaskStatus.CANCELLED)
                .priority(TaskPriority.HIGH)
                .dueDate(LocalDateTime.now().plusDays(3))
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        Map<String, String> body = Map.of("status", "CANCELLED");

        given(taskService.updateTaskStatus(eq(taskId), eq(TaskStatus.CANCELLED)))
                .willReturn(cancelledTask);

        mockMvc.perform(MockMvcRequestBuilders
                        .patch("/api/v1/tasks/{id}/status", taskId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELLED"));
    }

    // ==================== DELETE /api/v1/tasks/{id} ====================

    @Test
    @WithMockUser
    void deleteTask_shouldReturn200() throws Exception {
        willDoNothing().given(taskService).deleteTask(taskId);

        mockMvc.perform(MockMvcRequestBuilders
                        .delete("/api/v1/tasks/{id}", taskId))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser
    void deleteTask_taskNotFound_shouldReturn404() throws Exception {
        willThrow(new RuntimeException("Task not found with id: " + taskId))
                .given(taskService).deleteTask(taskId);

        mockMvc.perform(MockMvcRequestBuilders
                        .delete("/api/v1/tasks/{id}", taskId))
                .andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser
    void deleteTask_otherRuntimeException_shouldPropagate500() throws Exception {
        willThrow(new RuntimeException("Database connection error"))
                .given(taskService).deleteTask(taskId);

        mockMvc.perform(MockMvcRequestBuilders
                        .delete("/api/v1/tasks/{id}", taskId))
                .andExpect(status().is5xxServerError());
    }
}