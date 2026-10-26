package com.affin.hrm.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mail.MailSendException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

class EmailServiceTest {

    private EmailService emailService;
    private JavaMailSender mailSender;

    @BeforeEach
    void setUp() {
        emailService = new EmailService();
        mailSender = mock(JavaMailSender.class);
        ReflectionTestUtils.setField(emailService, "mailSender", mailSender);
        ReflectionTestUtils.setField(emailService, "fromEmail", "noreply@hrm.com");
        ReflectionTestUtils.setField(emailService, "frontendUrl", "http://front.test");
    }

    private SimpleMailMessage captureSent() {
        ArgumentCaptor<SimpleMailMessage> captor = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender).send(captor.capture());
        return captor.getValue();
    }

    @Test
    void sendRequestReceivedEmail_sendsViaSmtp() {
        boolean result = emailService.sendRequestReceivedEmail("c@acme.com", "Jane", "Acme");

        assertTrue(result);
        SimpleMailMessage msg = captureSent();
        assertEquals("noreply@hrm.com", msg.getFrom());
        assertEquals("c@acme.com", msg.getTo()[0]);
        assertTrue(msg.getSubject().contains("Acme"));
        assertTrue(msg.getText().contains("Dear Jane"));
    }

    @Test
    void sendRequestReceivedEmail_nullContact_usesDefaultSalutation() {
        emailService.sendRequestReceivedEmail("c@acme.com", null, "Acme");

        SimpleMailMessage msg = captureSent();
        assertTrue(msg.getText().contains("Dear Client Representative"));
        assertTrue(msg.getText().contains("Contact Person: N/A"));
    }

    @Test
    void sendApprovalEmail_containsLoginUrlAndPassword() {
        boolean result = emailService.sendApprovalEmail("c@acme.com", "Jane", "Acme", "Pw123456");

        assertTrue(result);
        SimpleMailMessage msg = captureSent();
        assertNotNull(msg.getText());
        assertTrue(msg.getText().contains("http://front.test/login"));
        assertTrue(msg.getText().contains("Temporary Password: Pw123456"));
        assertTrue(msg.getText().contains("HR Account Email: c@acme.com"));
    }

    @Test
    void sendApprovalEmail_nullPassword_usesPlaceholder() {
        emailService.sendApprovalEmail("c@acme.com", "Jane", "Acme", null);

        assertTrue(captureSent().getText().contains("[Provided during setup]"));
    }

    @Test
    void sendRejectionEmail_includesReason() {
        emailService.sendRejectionEmail("c@acme.com", "Jane", "Acme", "Incomplete documents");

        SimpleMailMessage msg = captureSent();
        assertTrue(msg.getText().contains("Incomplete documents"));
    }

    @Test
    void sendRejectionEmail_nullReason_usesDefaultReason() {
        emailService.sendRejectionEmail("c@acme.com", "Jane", "Acme", null);

        assertTrue(captureSent().getText().contains("Application did not meet requirements."));
    }

    @Test
    void sendEmail_smtpFailure_fallsBackAndStillReturnsTrue() {
        doThrow(new MailSendException("smtp down")).when(mailSender).send(any(SimpleMailMessage.class));

        assertTrue(emailService.sendRejectionEmail("c@acme.com", "Jane", "Acme", "x"));
    }

    @Test
    void sendEmail_noMailSender_usesConsoleFallback() {
        ReflectionTestUtils.setField(emailService, "mailSender", null);

        assertTrue(emailService.sendApprovalEmail("c@acme.com", "Jane", "Acme", "pw"));
    }

    @Test
    void sendEmail_emptyFromEmail_skipsSmtp() {
        ReflectionTestUtils.setField(emailService, "fromEmail", "");

        assertTrue(emailService.sendRequestReceivedEmail("c@acme.com", "Jane", "Acme"));
        org.mockito.Mockito.verifyNoInteractions(mailSender);
    }
}
