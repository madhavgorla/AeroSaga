package com.aerosaga.api;

import com.aerosaga.mission.ApiException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import java.time.Instant;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class ApiExceptionHandler {
    private static final Logger LOGGER = LoggerFactory.getLogger(ApiExceptionHandler.class);

    @ExceptionHandler(ApiException.class)
    public org.springframework.http.ResponseEntity<ApiError> handleApiException(
        ApiException exception, HttpServletRequest request
    ) {
        return response(exception.getStatus(), exception.getCode(), exception.getMessage(), List.of(), request);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public org.springframework.http.ResponseEntity<ApiError> handleValidation(
        MethodArgumentNotValidException exception, HttpServletRequest request
    ) {
        List<String> details = exception.getBindingResult().getFieldErrors().stream()
            .map(ApiExceptionHandler::validationMessage)
            .distinct()
            .toList();
        return response(HttpStatus.BAD_REQUEST, "INVALID_REQUEST", "Request validation failed", details, request);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public org.springframework.http.ResponseEntity<ApiError> handleConstraintViolation(
        ConstraintViolationException exception, HttpServletRequest request
    ) {
        List<String> details = exception.getConstraintViolations().stream()
            .map(violation -> violation.getPropertyPath() + ": " + violation.getMessage())
            .toList();
        return response(HttpStatus.BAD_REQUEST, "INVALID_REQUEST", "Request validation failed", details, request);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public org.springframework.http.ResponseEntity<ApiError> handleUnreadableRequest(
        HttpMessageNotReadableException exception, HttpServletRequest request
    ) {
        return response(HttpStatus.BAD_REQUEST, "INVALID_JSON", "Request body is missing or invalid", List.of(), request);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public org.springframework.http.ResponseEntity<ApiError> handleDataConflict(
        DataIntegrityViolationException exception, HttpServletRequest request
    ) {
        return response(HttpStatus.CONFLICT, "DATA_CONFLICT", "The request conflicts with current data", List.of(), request);
    }

    @ExceptionHandler(Exception.class)
    public org.springframework.http.ResponseEntity<ApiError> handleUnexpected(
        Exception exception, HttpServletRequest request
    ) {
        LOGGER.error("Unhandled API error for {}", request.getRequestURI(), exception);
        return response(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR",
            "The request could not be completed", List.of(), request);
    }

    private static String validationMessage(FieldError error) {
        return error.getField() + ": " + error.getDefaultMessage();
    }

    private static org.springframework.http.ResponseEntity<ApiError> response(
        HttpStatus status, String code, String message, List<String> details, HttpServletRequest request
    ) {
        return org.springframework.http.ResponseEntity.status(status)
            .body(new ApiError(Instant.now(), status.value(), code, message, details, request.getRequestURI()));
    }

    public record ApiError(Instant timestamp, int status, String code, String message, List<String> details, String path) {}
}