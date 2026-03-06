package com.example.backend.controllers.secretary;

import com.example.backend.models.secretary.Task;
import com.example.backend.models.secretary.TaskStatus;
import com.example.backend.services.secretary.TaskService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/tasks")
public class TaskController {

    @Autowired
    private TaskService taskService;

    // Create a new task (secretary)
    @PostMapping
    public ResponseEntity<Task> createTask(
            @RequestBody Map<String, Object> requestBody,
            @RequestParam UUID secretaryId) {
        Task task = taskService.createTask(requestBody, secretaryId);
        return new ResponseEntity<>(task, HttpStatus.CREATED);
    }

    // Get all tasks (secretary / admin view)
    @GetMapping
    public ResponseEntity<List<Task>> getAllTasks() {
        List<Task> tasks = taskService.getAllTasks();
        return new ResponseEntity<>(tasks, HttpStatus.OK);
    }

    // Get a single task by ID
    @GetMapping("/{id}")
    public ResponseEntity<Task> getTaskById(@PathVariable UUID id) {
        Task task = taskService.getTaskById(id);
        return new ResponseEntity<>(task, HttpStatus.OK);
    }

    // Get tasks assigned to a specific user
    @GetMapping("/user/{userId}")
    public ResponseEntity<List<Task>> getTasksByUser(@PathVariable UUID userId) {
        List<Task> tasks = taskService.getTasksByAssignedUser(userId);
        return new ResponseEntity<>(tasks, HttpStatus.OK);
    }

    // Get tasks by status
    @GetMapping("/status/{status}")
    public ResponseEntity<List<Task>> getTasksByStatus(@PathVariable TaskStatus status) {
        List<Task> tasks = taskService.getTasksByStatus(status);
        return new ResponseEntity<>(tasks, HttpStatus.OK);
    }

    // Get tasks by user and status
    @GetMapping("/user/{userId}/status/{status}")
    public ResponseEntity<List<Task>> getTasksByUserAndStatus(
            @PathVariable UUID userId,
            @PathVariable TaskStatus status) {
        List<Task> tasks = taskService.getTasksByUserAndStatus(userId, status);
        return new ResponseEntity<>(tasks, HttpStatus.OK);
    }

    // Update a task (secretary)
    @PutMapping("/{id}")
    public ResponseEntity<Task> updateTask(
            @PathVariable UUID id,
            @RequestBody Map<String, Object> requestBody) {
        Task updatedTask = taskService.updateTask(id, requestBody);
        return new ResponseEntity<>(updatedTask, HttpStatus.OK);
    }

    // Update task status only (assigned user)
    @PatchMapping("/{id}/status")
    public ResponseEntity<Task> updateTaskStatus(
            @PathVariable UUID id,
            @RequestBody Map<String, String> body) {
        TaskStatus newStatus = TaskStatus.valueOf(body.get("status"));
        Task updatedTask = taskService.updateTaskStatus(id, newStatus);
        return new ResponseEntity<>(updatedTask, HttpStatus.OK);
    }

    // Delete a task (secretary)
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteTask(@PathVariable UUID id) {
        try {
            taskService.deleteTask(id);
            return ResponseEntity.ok().build();
        } catch (RuntimeException e) {
            if (e.getMessage().contains("Task not found")) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("TASK_NOT_FOUND");
            }
            throw e;
        }
    }
}
