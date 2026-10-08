Feature: Web smoke
  As a QA engineer
  I want to verify basic web availability
  So that I can confirm app shell routes are reachable

  Scenario: Login page renders
    Given the web application is running
    When I open the login page
    Then I should see the "Login" heading
