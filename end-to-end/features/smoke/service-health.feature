Feature: Service health smoke
  As a QA engineer
  I want to verify API health
  So that I can confirm backend availability

  Scenario: Lead service health endpoint responds
    Given the lead service is running
    When I request the lead service health endpoint
    Then the lead service health response should include "status"
