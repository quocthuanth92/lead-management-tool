@us1 @api
Feature: Lead inbox
  As a salesperson
  I want to see my leads with unread ones first
  So that I can work on new enquiries before older ones

  Scenario: Unread leads are listed first and each group is newest first
    Given salesperson "A" has at least 3 leads in the inbox
    When I request the inbox of salesperson "A"
    Then the response status should be 200
    And unread leads are listed before read leads
    And each group is ordered by newest update first

  Scenario: The inbox defaults to the last six months
    When I request the inbox of salesperson "A"
    Then the response status should be 200
    And every listed lead was updated within the last six months

  Scenario: The inbox pages through the results
    Given salesperson "A" has at least 2 leads in the inbox
    When I request page 1 of the inbox of salesperson "A" with a limit of 1
    And I request page 2 of the inbox of salesperson "A" with a limit of 1
    Then both pages report the same total of at least 2
    And the two pages show different leads

  Scenario: A date window without leads returns an empty inbox
    When I request the inbox of salesperson "A" for the dates "2000-01-01" to "2000-01-31"
    Then the response status should be 200
    And the inbox is empty

  Scenario: A salesperson cannot open the leads of another salesperson
    Given salesperson "A" has at least 1 lead in the inbox
    Then salesperson "B" cannot open the leads of salesperson "A"
