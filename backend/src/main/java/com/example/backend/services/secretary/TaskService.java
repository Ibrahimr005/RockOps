package com.example.backend.services.secretary;

import com.example.backend.models.notification.NotificationType;
import com.example.backend.models.secretary.Task;
import com.example.backend.models.secretary.TaskPriority;
import com.example.backend.models.secretary.TaskStatus;
import com.example.backend.models.user.User;
import com.example.backend.repositories.secretary.TaskRepository;
import com.example.backend.repositories.user.UserRepository;
import com.example.backend.services.notification.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@Transactional
public class TaskService {

    @Autowired
    private TaskRepository taskRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired(required = false)
    private NotificationService notificationService;

    // ================= CREATE =================

    public Task createTask(Map<String, Object> requestBody, UUID secretaryId) {
        String title = (String) requestBody.get("title");
        String description = (String) requestBody.get("description");
        String notes = (String) requestBody.get("notes");
        String priorityStr = (String) requestBody.get("priority");
        String dueDateStr = (String) requestBody.get("dueDate");
        String assignedToIdStr = (String) requestBody.get("assignedToId");

        User secretary = userRepository.findById(secretaryId)
                .orElseThrow(() -> new RuntimeException("Secretary not found with ID: " + secretaryId));

        UUID assignedToId = UUID.fromString(assignedToIdStr);
        User assignedTo = userRepository.findById(assignedToId)
                .orElseThrow(() -> new RuntimeException("Assigned user not found with ID: " + assignedToId));

        Task task = new Task();
        task.setTitle(title);
        task.setDescription(description);
        task.setNotes(notes);
        task.setAssignedBy(secretary);
        task.setAssignedTo(assignedTo);
        task.setPriority(priorityStr != null ? TaskPriority.valueOf(priorityStr) : TaskPriority.MEDIUM);
        task.setDueDate(LocalDateTime.parse(dueDateStr));

        Task savedTask = taskRepository.save(task);

        // Notify the assigned user
        try {
            if (notificationService != null) {
                notificationService.sendNotificationToUser(
                        assignedTo,
                        "New Task Assigned",
                        String.format("You have been assigned a new task: '%s' by %s %s. Due: %s",
                                title,
                                secretary.getFirstName(),
                                secretary.getLastName(),
                                dueDateStr),
                        NotificationType.INFO,
                        "/secretary/tasks",
                        "Task_" + savedTask.getId()
                );
                System.out.println("✅ Task assignment notification sent to: " + assignedTo.getUsername());
            }
        } catch (Exception e) {
            System.err.println("⚠️ Failed to send task assignment notification: " + e.getMessage());
        }

        return savedTask;
    }

    // ================= READ =================

    public List<Task> getAllTasks() {
        return taskRepository.findAllByOrderByCreatedAtDesc();
    }

    public Task getTaskById(UUID taskId) {
        return taskRepository.findById(taskId)
                .orElseThrow(() -> new RuntimeException("Task not found with ID: " + taskId));
    }

    public List<Task> getTasksByAssignedUser(UUID userId) {
        return taskRepository.findByAssignedTo_IdOrderByDueDateAsc(userId);
    }

    public List<Task> getTasksByStatus(TaskStatus status) {
        return taskRepository.findByStatus(status);
    }

    public List<Task> getTasksByUserAndStatus(UUID userId, TaskStatus status) {
        return taskRepository.findByAssignedTo_IdAndStatus(userId, status);
    }

    // ================= UPDATE =================

    public Task updateTask(UUID taskId, Map<String, Object> requestBody) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new RuntimeException("Task not found with ID: " + taskId));

        if (requestBody.containsKey("title"))
            task.setTitle((String) requestBody.get("title"));

        if (requestBody.containsKey("description"))
            task.setDescription((String) requestBody.get("description"));

        if (requestBody.containsKey("notes"))
            task.setNotes((String) requestBody.get("notes"));

        if (requestBody.containsKey("priority"))
            task.setPriority(TaskPriority.valueOf((String) requestBody.get("priority")));

        if (requestBody.containsKey("dueDate"))
            task.setDueDate(LocalDateTime.parse((String) requestBody.get("dueDate")));

        if (requestBody.containsKey("assignedToId")) {
            UUID newAssigneeId = UUID.fromString((String) requestBody.get("assignedToId"));
            User newAssignee = userRepository.findById(newAssigneeId)
                    .orElseThrow(() -> new RuntimeException("User not found with ID: " + newAssigneeId));
            task.setAssignedTo(newAssignee);
        }

        Task updatedTask = taskRepository.save(task);

        // Notify the assigned user about the update
        try {
            if (notificationService != null) {
                notificationService.sendNotificationToUser(
                        updatedTask.getAssignedTo(),
                        "Task Updated",
                        String.format("Your task '%s' has been updated.", updatedTask.getTitle()),
                        NotificationType.INFO,
                        "/secretary/tasks",
                        "Task_" + updatedTask.getId()
                );
            }
        } catch (Exception e) {
            System.err.println("⚠️ Failed to send task update notification: " + e.getMessage());
        }

        return updatedTask;
    }

    public Task updateTaskStatus(UUID taskId, TaskStatus newStatus) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new RuntimeException("Task not found with ID: " + taskId));

        TaskStatus oldStatus = task.getStatus();
        task.setStatus(newStatus);
        Task updatedTask = taskRepository.save(task);

        // If completed, notify the secretary
        try {
            if (notificationService != null && newStatus == TaskStatus.COMPLETED) {
                notificationService.sendNotificationToUser(
                        updatedTask.getAssignedBy(),
                        "Task Completed",
                        String.format("%s %s has completed the task: '%s'.",
                                updatedTask.getAssignedTo().getFirstName(),
                                updatedTask.getAssignedTo().getLastName(),
                                updatedTask.getTitle()),
                        NotificationType.SUCCESS,
                        "/secretary/tasks",
                        "Task_" + updatedTask.getId()
                );
            }
            // If cancelled, notify the assigned user
            if (notificationService != null && newStatus == TaskStatus.CANCELLED) {
                notificationService.sendNotificationToUser(
                        updatedTask.getAssignedTo(),
                        "Task Cancelled",
                        String.format("The task '%s' has been cancelled.", updatedTask.getTitle()),
                        NotificationType.WARNING,
                        "/secretary/tasks",
                        "Task_" + updatedTask.getId()
                );
            }
        } catch (Exception e) {
            System.err.println("⚠️ Failed to send task status notification: " + e.getMessage());
        }

        return updatedTask;
    }

    // ================= DELETE =================

    public void deleteTask(UUID taskId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new RuntimeException("Task not found with ID: " + taskId));

        String taskTitle = task.getTitle();
        User assignedTo = task.getAssignedTo();

        taskRepository.delete(task);
        System.out.println("Task deleted successfully: " + taskTitle);

        // Notify the assigned user
        try {
            if (notificationService != null) {
                notificationService.sendNotificationToUser(
                        assignedTo,
                        "Task Removed",
                        String.format("The task '%s' assigned to you has been removed.", taskTitle),
                        NotificationType.WARNING,
                        "/secretary/tasks",
                        "Task"
                );
            }
        } catch (Exception e) {
            System.err.println("⚠️ Failed to send task deletion notification: " + e.getMessage());
        }
    }
}