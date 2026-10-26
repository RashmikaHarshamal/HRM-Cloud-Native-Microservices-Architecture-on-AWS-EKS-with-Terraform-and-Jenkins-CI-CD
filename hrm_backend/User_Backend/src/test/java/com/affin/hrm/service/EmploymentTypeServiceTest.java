package com.airella.hrm.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class EmploymentTypeServiceTest {

    private static final String URL = "http://hr.test:5005/api/hr/employment-types";

    private final ObjectMapper mapper = new ObjectMapper();
    private RestTemplate restTemplate;
    private EmploymentTypeService service;

    @BeforeEach
    void setUp() {
        RequestContextHolder.resetRequestAttributes();
        restTemplate = mock(RestTemplate.class);
        service = new EmploymentTypeService();
        ReflectionTestUtils.setField(service, "restTemplate", restTemplate);
        ReflectionTestUtils.setField(service, "hrServiceUrl", "http://hr.test:5005");
    }

    @AfterEach
    void tearDown() {
        RequestContextHolder.resetRequestAttributes();
    }

    private void hrReturns(String json) throws Exception {
        JsonNode node = mapper.readTree(json);
        when(restTemplate.exchange(anyString(), eq(HttpMethod.GET), any(HttpEntity.class), eq(JsonNode.class)))
                .thenReturn(ResponseEntity.ok(node));
    }

    private static final String TYPES =
            "{\"data\":[{\"name\":\"Full-Time\"},{\"name\":\"Part-Time\"},{\"name\":\"Internship\"}]}";

    @Test
    void resolve_nullValue_returnsNullWithoutCallingHr() {
        assertNull(service.resolve(null, "Full-Time"));
        verifyNoInteractions(restTemplate);
    }

    @Test
    void resolve_blankValue_returnsNullWithoutCallingHr() {
        assertNull(service.resolve("   ", null));
        verifyNoInteractions(restTemplate);
    }

    @Test
    void resolve_sameAsCurrentValue_keepsCurrentWithoutCallingHr() {
        String result = service.resolve("  legacy type ", "Legacy Type");

        assertEquals("Legacy Type", result);
        verifyNoInteractions(restTemplate);
    }

    @Test
    void resolve_matchesHrNameIgnoringCaseAndReturnsHrSpelling() throws Exception {
        hrReturns(TYPES);

        String result = service.resolve("  part-time ", null);

        assertEquals("Part-Time", result);
    }

    @Test
    void resolve_callsHrEmploymentTypesEndpoint() throws Exception {
        hrReturns(TYPES);

        service.resolve("Internship", null);

        verify(restTemplate).exchange(eq(URL), eq(HttpMethod.GET), any(HttpEntity.class), eq(JsonNode.class));
    }

    @Test
    void resolve_differentFromCurrent_stillValidatesAgainstHr() throws Exception {
        hrReturns(TYPES);

        String result = service.resolve("full-time", "Internship");

        assertEquals("Full-Time", result);
    }

    @Test
    void resolve_unknownType_throwsListingAllowedValues() throws Exception {
        hrReturns(TYPES);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> service.resolve("Contractor", null));

        assertEquals("Invalid employment type 'Contractor'. Allowed: Full-Time, Part-Time, Internship",
                ex.getMessage());
    }

    @Test
    void resolve_hrListEmpty_throwsNoTypesSetUp() throws Exception {
        hrReturns("{\"data\":[]}");

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> service.resolve("Full-Time", null));

        assertTrue(ex.getMessage().startsWith("No employment types are set up yet"));
    }

    @Test
    void resolve_hrBodyHasNoDataArray_treatedAsEmptyList() throws Exception {
        hrReturns("{\"message\":\"ok\"}");

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> service.resolve("Full-Time", null));

        assertTrue(ex.getMessage().startsWith("No employment types are set up yet"));
    }

    @Test
    void resolve_hrCallFails_throwsCouldNotCheck() {
        when(restTemplate.exchange(anyString(), eq(HttpMethod.GET), any(HttpEntity.class), eq(JsonNode.class)))
                .thenThrow(new RestClientException("connection refused"));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> service.resolve("Full-Time", null));

        assertTrue(ex.getMessage().startsWith("Could not check the employment type against HR's list"));
    }

    @Test
    void resolve_forwardsCallersAuthorizationHeaderToHr() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader(HttpHeaders.AUTHORIZATION, "Bearer abc.def.ghi");
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));
        hrReturns(TYPES);

        service.resolve("Full-Time", null);

        ArgumentCaptor<HttpEntity> captor = ArgumentCaptor.forClass(HttpEntity.class);
        verify(restTemplate).exchange(anyString(), eq(HttpMethod.GET), captor.capture(), eq(JsonNode.class));
        assertEquals("Bearer abc.def.ghi", captor.getValue().getHeaders().getFirst(HttpHeaders.AUTHORIZATION));
    }

    @Test
    void resolve_noRequestContext_sendsNoAuthorizationHeader() throws Exception {
        hrReturns(TYPES);

        service.resolve("Full-Time", null);

        ArgumentCaptor<HttpEntity> captor = ArgumentCaptor.forClass(HttpEntity.class);
        verify(restTemplate).exchange(anyString(), eq(HttpMethod.GET), captor.capture(), eq(JsonNode.class));
        assertNull(captor.getValue().getHeaders().getFirst(HttpHeaders.AUTHORIZATION));
    }
}
