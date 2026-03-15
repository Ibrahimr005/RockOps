package com.example.backend.services.secretary;

import com.example.backend.models.secretary.Task;
import com.example.backend.models.secretary.TaskPriority;
import com.example.backend.models.secretary.TaskStatus;
import com.example.backend.models.user.User;
import com.example.backend.repositories.secretary.TaskRepository;
import com.example.backend.repositories.user.UserRepository;
import com.example.backend.services.notification.NotificationService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class TaskServiceTest {

    @Mock
    private TaskRepository taskRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private TaskService taskService;

    // ==================== createTask ====================

    @Test
    public void createTask_validRequest_shouldCreateAndReturnTask() {
        UUID secretaryId = UUID.randomUUID();
        UUID assignedToId = UUID.randomUUID();

        User secretary = buildUser(secretaryId, "John", "Doe");
        User assignee = buildUser(assignedToId, "Jane", "Smith");

        Map<String, Object> request = buildTaskRequest(
                "Fix Server", "Critical fix", "Urgent notes",
                "HIGH", LocalDateTime.now().plusDays(1).toString(), assignedToId.toString()
        );

        when(userRepository.findById(secretaryId)).thenReturn(Optional.of(secretary));
        when(userRepository.findById(assignedToId)).thenReturn(Optional.of(assignee));
        when(taskRepository.save(any(Task.class))).thenAnswer(inv -> {
            Task t = inv.getArgument(0);
            t.setId(UUID.randomUUID());
            return t;
        });

        Task result = taskService.createTask(request, secretaryId);

        assertNotNull(result);
        assertEquals("Fix Server", result.getTitle());
        assertEquals(TaskPriority.HIGH, result.getPriority());
        assertEquals(secretary, result.getAssignedBy());
        assertEquals(assignee, result.getAssignedTo());
        verify(taskRepository).save(any(Task.class));
    }

    @Test
    public void createTask_defaultPriority_shouldUseMedium() {
        UUID secretaryId = UUID.randomUUID();
        UUID assignedToId = UUID.randomUUID();

        User secretary = buildUser(secretaryId, "John", "Doe");
        User assignee = buildUser(assignedToId, "Jane", "Smith");

        Map<String, Object> request = new HashMap<>();
        request.put("title", "Low Priority Task");
        request.put("description", "desc");
        request.put("dueDate", LocalDateTime.now().plusDays(2).toString());
        request.put("assignedToId", assignedToId.toString());
        // no priority set

        when(userRepository.findById(secretaryId)).thenReturn(Optional.of(secretary));
        when(userRepository.findById(assignedToId)).thenReturn(Optional.of(assignee));
        when(taskRepository.save(any(Task.class))).thenAnswer(inv -> inv.getArgument(0));

        Task result = taskService.createTask(request, secretaryId);

        assertEquals(TaskPriority.MEDIUM, result.getPriority());
    }

    @Test
    public void createTask_secretaryNotFound_shouldThrow() {
        UUID secretaryId = UUID.randomUUID();
        UUID assignedToId = UUID.randomUUID();

        when(userRepository.findById(secretaryId)).thenReturn(Optional.empty());

        Map<String, Object> request = buildTaskRequest(
                "Task", "Desc", null,
                "LOW", LocalDateTime.now().plusDays(1).toString(), assignedToId.toString()
        );

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> taskService.createTask(request, secretaryId));
        assertTrue(ex.getMessage().contains("Secretary not found"));
        verify(taskRepository, never()).save(any());
    }

    @Test
    public void createTask_assigneeNotFound_shouldThrow() {
        UUID secretaryId = UUID.randomUUID();
        UUID assignedToId = UUID.randomUUID();

        User secretary = buildUser(secretaryId, "John", "Doe");

        when(userRepository.findById(secretaryId)).thenReturn(Optional.of(secretary));
        when(userRepository.findById(assignedToId)).thenReturn(Optional.empty());

        Map<String, Object> request = buildTaskRequest(
                "Task", "Desc", null,
                "LOW", LocalDateTime.now().plusDays(1).toString(), assignedToId.toString()
        );

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> taskService.createTask(request, secretaryId));
        assertTrue(ex.getMessage().contains("Assigned user not found"));
        verify(taskRepository, never()).save(any());
    }

    @Test
    public void createTask_notificationServicePresent_shouldSendNotification() {
        UUID secretaryId = UUID.randomUUID();
        UUID assignedToId = UUID.randomUUID();

        User secretary = buildUser(secretaryId, "John", "Doe");
        User assignee = buildUser(assignedToId, "Jane", "Smith");

        Map<String, Object> request = buildTaskRequest(
                "Notify Task", "desc", null,
                "MEDIUM", LocalDateTime.now().plusDays(1).toString(), assignedToId.toString()
        );

        when(userRepository.findById(secretaryId)).thenReturn(Optional.of(secretary));
        when(userRepository.findById(assignedToId)).thenReturn(Optional.of(assignee));
        when(taskRepository.save(any(Task.class))).thenAnswer(inv -> {
            Task t = inv.getArgument(0);
            t.setId(UUID.randomUUID());
            return t;
        });

        taskService.createTask(request, secretaryId);

        verify(notificationService).sendNotificationToUser(
                eq(assignee), anyString(), anyString(), any(), anyString(), anyString()
        );
    }

    // ==================== getAllTasks ====================

    @Test
    public void getAllTasks_shouldReturnAllOrderedByCreatedAt() {
        List<Task> tasks = List.of(buildTask("Task 1"), buildTask("Task 2"));
        when(taskRepository.findAllByOrderByCreatedAtDesc()).thenReturn(tasks);

        List<Task> result = taskService.getAllTasks();

        assertEquals(2, result.size());
        verify(taskRepository).findAllByOrderByCreatedAtDesc();
    }

    @Test
    public void getAllTasks_empty_shouldReturnEmpty() {
        when(taskRepository.findAllByOrderByCreatedAtDesc()).thenReturn(List.of());

        List<Task> result = taskService.getAllTasks();

        assertTrue(result.isEmpty());
    }

    // ==================== getTaskById ====================

    @Test
    public void getTaskById_found_shouldReturnTask() {
        UUID taskId = UUID.randomUUID();
        Task task = buildTask("My Task");
        task.setId(taskId);

        when(taskRepository.findById(taskId)).thenReturn(Optional.of(task));

        Task result = taskService.getTaskById(taskId);

        assertEquals("My Task", result.getTitle());
    }

    @Test
    public void getTaskById_notFound_shouldThrow() {
        UUID taskId = UUID.randomUUID();
        when(taskRepository.findById(taskId)).thenReturn(Optional.empty());

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> taskService.getTaskById(taskId));
        assertTrue(ex.getMessage().contains("Task not found"));
    }

    // ==================== getTasksByAssignedUser ====================

    @Test
    public void getTasksByAssignedUser_shouldReturnUserTasks() {
        UUID userId = UUID.randomUUID();
        List<Task> tasks = List.of(buildTask("Task A"), buildTask("Task B"));
        when(taskRepository.findByAssignedTo_IdOrderByDueDateAsc(userId)).thenReturn(tasks);

        List<Task> result = taskService.getTasksByAssignedUser(userId);

        assertEquals(2, result.size());
        verify(taskRepository).findByAssignedTo_IdOrderByDueDateAsc(userId);
    }

    // ==================== getTasksByStatus ====================

    @Test
    public void getTasksByStatus_pending_shouldReturnPendingTasks() {
        List<Task> tasks = List.of(buildTask("Pending Task"));
        when(taskRepository.findByStatus(TaskStatus.PENDING)).thenReturn(tasks);

        List<Task> result = taskService.getTasksByStatus(TaskStatus.PENDING);

        assertEquals(1, result.size());
    }

    @Test
    public void getTasksByStatus_completed_shouldReturnCompletedTasks() {
        List<Task> tasks = List.of(buildTask("Done"), buildTask("Also Done"));
        when(taskRepository.findByStatus(TaskStatus.COMPLETED)).thenReturn(tasks);

        List<Task> result = taskService.getTasksByStatus(TaskStatus.COMPLETED);

        assertEquals(2, result.size());
    }

    // ==================== getTasksByUserAndStatus ====================

    @Test
    public void getTasksByUserAndStatus_shouldReturnMatchingTasks() {
        UUID userId = UUID.randomUUID();
        List<Task> tasks = List.of(buildTask("User Active Task"));
        when(taskRepository.findByAssignedTo_IdAndStatus(userId, TaskStatus.IN_PROGRESS))
                .thenReturn(tasks);

        List<Task> result = taskService.getTasksByUserAndStatus(userId, TaskStatus.IN_PROGRESS);

        assertEquals(1, result.size());
        verify(taskRepository).findByAssignedTo_IdAndStatus(userId, TaskStatus.IN_PROGRESS);
    }

    // ==================== updateTask ====================

    @Test
    public void updateTask_updateTitle_shouldUpdateTask() {
        UUID taskId = UUID.randomUUID();
        Task existing = buildTask("Old Title");
        existing.setId(taskId);

        when(taskRepository.findById(taskId)).thenReturn(Optional.of(existing));
        when(taskRepository.save(any(Task.class))).thenAnswer(inv -> inv.getArgument(0));

        Map<String, Object> request = new HashMap<>();
        request.put("title", "New Title");

        Task result = taskService.updateTask(taskId, request);

        assertEquals("New Title", result.getTitle());
    }

    @Test
    public void updateTask_updatePriority_shouldUpdatePriority() {
        UUID taskId = UUID.randomUUID();
        Task existing = buildTask("Task");
        existing.setId(taskId);
        existing.setPriority(TaskPriority.LOW);

        when(taskRepository.findById(taskId)).thenReturn(Optional.of(existing));
        when(taskRepository.save(any(Task.class))).thenAnswer(inv -> inv.getArgument(0));

        Map<String, Object> request = new HashMap<>();
        request.put("priority", "URGENT");

        Task result = taskService.updateTask(taskId, request);

        assertEquals(TaskPriority.URGENT, result.getPriority());
    }

    @Test
    public void updateTask_updateDueDate_shouldUpdateDueDate() {
        UUID taskId = UUID.randomUUID();
        Task existing = buildTask("Task");
        existing.setId(taskId);
        LocalDateTime newDue = LocalDateTime.now().plusDays(10);

        when(taskRepository.findById(taskId)).thenReturn(Optional.of(existing));
        when(taskRepository.save(any(Task.class))).thenAnswer(inv -> inv.getArgument(0));

        Map<String, Object> request = new HashMap<>();
        request.put("dueDate", newDue.toString());

        Task result = taskService.updateTask(taskId, request);

        assertEquals(newDue, result.getDueDate());
    }

    @Test
    public void updateTask_updateAssignee_shouldChangeAssignedTo() {
        UUID taskId = UUID.randomUUID();
        UUID newAssigneeId = UUID.randomUUID();

        Task existing = buildTask("Task");
        existing.setId(taskId);

        User newAssignee = buildUser(newAssigneeId, "New", "Assignee");

        when(taskRepository.findById(taskId)).thenReturn(Optional.of(existing));
        when(userRepository.findById(newAssigneeId)).thenReturn(Optional.of(newAssignee));
        when(taskRepository.save(any(Task.class))).thenAnswer(inv -> inv.getArgument(0));

        Map<String, Object> request = new HashMap<>();
        request.put("assignedToId", newAssigneeId.toString());

        Task result = taskService.updateTask(taskId, request);

        assertEquals(newAssignee, result.getAssignedTo());
    }

    @Test
    public void updateTask_taskNotFound_shouldThrow() {
        UUID taskId = UUID.randomUUID();
        when(taskRepository.findById(taskId)).thenReturn(Optional.empty());

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> taskService.updateTask(taskId, new HashMap<>()));
        assertTrue(ex.getMessage().contains("Task not found"));
    }

    @Test
    public void updateTask_invalidNewAssignee_shouldThrow() {
        UUID taskId = UUID.randomUUID();
        UUID badUserId = UUID.randomUUID();

        Task existing = buildTask("Task");
        existing.setId(taskId);

        when(taskRepository.findById(taskId)).thenReturn(Optional.of(existing));
        when(userRepository.findById(badUserId)).thenReturn(Optional.empty());

        Map<String, Object> request = new HashMap<>();
        request.put("assignedToId", badUserId.toString());

        assertThrows(RuntimeException.class,
                () -> taskService.updateTask(taskId, request));
    }

    // ==================== updateTaskStatus ====================

    @Test
    public void updateTaskStatus_toPending_shouldUpdateStatus() {
        UUID taskId = UUID.randomUUID();
        Task task = buildTask("Task");
        task.setId(taskId);
        task.setStatus(TaskStatus.PENDING);
        task.setAssignedBy(buildUser(UUID.randomUUID(), "Boss", "Man"));
        task.setAssignedTo(buildUser(UUID.randomUUID(), "Worker", "Bee"));

        when(taskRepository.findById(taskId)).thenReturn(Optional.of(task));
        when(taskRepository.save(any(Task.class))).thenAnswer(inv -> inv.getArgument(0));

        Task result = taskService.updateTaskStatus(taskId, TaskStatus.IN_PROGRESS);

        assertEquals(TaskStatus.IN_PROGRESS, result.getStatus());
    }

    @Test
    public void updateTaskStatus_toCompleted_shouldNotifyAssignedBy() {
        UUID taskId = UUID.randomUUID();
        User secretary = buildUser(UUID.randomUUID(), "Boss", "Man");
        User worker = buildUser(UUID.randomUUID(), "Worker", "Bee");

        Task task = buildTask("Completed Task");
        task.setId(taskId);
        task.setAssignedBy(secretary);
        task.setAssignedTo(worker);

        when(taskRepository.findById(taskId)).thenReturn(Optional.of(task));
        when(taskRepository.save(any(Task.class))).thenAnswer(inv -> inv.getArgument(0));

        taskService.updateTaskStatus(taskId, TaskStatus.COMPLETED);

        verify(notificationService).sendNotificationToUser(
                eq(secretary), anyString(), anyString(), any(), anyString(), anyString()
        );
    }

    @Test
    public void updateTaskStatus_toCancelled_shouldNotifyAssignedTo() {
        UUID taskId = UUID.randomUUID();
        User secretary = buildUser(UUID.randomUUID(), "Boss", "Man");
        User worker = buildUser(UUID.randomUUID(), "Worker", "Bee");

        Task task = buildTask("Cancelled Task");
        task.setId(taskId);
        task.setAssignedBy(secretary);
        task.setAssignedTo(worker);

        when(taskRepository.findById(taskId)).thenReturn(Optional.of(task));
        when(taskRepository.save(any(Task.class))).thenAnswer(inv -> inv.getArgument(0));

        taskService.updateTaskStatus(taskId, TaskStatus.CANCELLED);

        verify(notificationService).sendNotificationToUser(
                eq(worker), anyString(), anyString(), any(), anyString(), anyString()
        );
    }

    @Test
    public void updateTaskStatus_taskNotFound_shouldThrow() {
        UUID taskId = UUID.randomUUID();
        when(taskRepository.findById(taskId)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class,
                () -> taskService.updateTaskStatus(taskId, TaskStatus.COMPLETED));
    }

    // ==================== deleteTask ====================

    @Test
    public void deleteTask_found_shouldDeleteAndNotify() {
        UUID taskId = UUID.randomUUID();
        User assignedTo = buildUser(UUID.randomUUID(), "Worker", "Bee");

        Task task = buildTask("To Delete");
        task.setId(taskId);
        task.setAssignedTo(assignedTo);

        when(taskRepository.findById(taskId)).thenReturn(Optional.of(task));

        taskService.deleteTask(taskId);

        verify(taskRepository).delete(task);
        verify(notificationService).sendNotificationToUser(
                eq(assignedTo), anyString(), anyString(), any(), anyString(), anyString()
        );
    }

    @Test
    public void deleteTask_notFound_shouldThrow() {
        UUID taskId = UUID.randomUUID();
        when(taskRepository.findById(taskId)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class,
                () -> taskService.deleteTask(taskId));
        verify(taskRepository, never()).delete(any());
    }

    // ==================== Helpers ====================

    private User buildUser(UUID id, String firstName, String lastName) {
        User user = new User();
        user.setId(id);
        user.setFirstName(firstName);
        user.setLastName(lastName);
        user.setUsername(firstName.toLowerCase() + "." + lastName.toLowerCase());
        return user;
    }

    private Task buildTask(String title) {
        Task task = new Task();
        task.setId(UUID.randomUUID());
        task.setTitle(title);
        task.setStatus(TaskStatus.PENDING);
        task.setPriority(TaskPriority.MEDIUM);
        task.setDueDate(LocalDateTime.now().plusDays(3));
        return task;
    }

    private Map<String, Object> buildTaskRequest(String title, String description, String notes,
                                                   String priority, String dueDate, String assignedToId) {
        Map<String, Object> request = new HashMap<>();
        request.put("title", title);
        request.put("description", description);
        request.put("notes", notes);
        request.put("priority", priority);
        request.put("dueDate", dueDate);
        request.put("assignedToId", assignedToId);
        return request;
    }
}