package com.example.backend.repositories.secretary;

import com.example.backend.models.secretary.Task;
import com.example.backend.models.secretary.TaskStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface TaskRepository extends JpaRepository<Task, UUID> {

    List<Task> findByAssignedTo_Id(UUID userId);

    List<Task> findByAssignedBy_Id(UUID secretaryId);

    List<Task> findByStatus(TaskStatus status);

    List<Task> findByAssignedTo_IdAndStatus(UUID userId, TaskStatus status);

    List<Task> findByAssignedTo_IdOrderByDueDateAsc(UUID userId);

    List<Task> findAllByOrderByCreatedAtDesc();
}