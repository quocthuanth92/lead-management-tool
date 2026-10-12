@us5 @api
Feature: Lead search
  As a salesperson
  I want to search my leads by name, email, phone and label
  So that I can find a lead quickly within the date range I am viewing

  Scenario: Search by name finds the lead
    Given a new lead is ingested through the internal API
    And I am signed in as the lead owner
    When I search the lead owner inbox for the lead name
    Then the response status should be 200
    And the search results include the lead

  Scenario: Search by email finds the lead
    Given a new lead is ingested through the internal API
    And I am signed in as the lead owner
    When I search the lead owner inbox for the lead email
    Then the search results include the lead

  Scenario: Search by phone number finds the lead
    Given a new lead is ingested through the internal API
    And I am signed in as the lead owner
    When I search the lead owner inbox for the lead phone
    Then the search results include the lead

  Scenario: The label filter narrows the results
    Given a new lead is ingested through the internal API
    And I am signed in as the lead owner
    And I set the label to "POTENTIAL"
    When I search the lead owner inbox for the lead name with label "SPAM"
    Then the search results do not include the lead
    When I search the lead owner inbox for the lead name with label "POTENTIAL"
    Then the search results include the lead

  Scenario: Leads outside the selected date range are excluded
    Given a new lead is ingested through the internal API
    And I am signed in as the lead owner
    When I search the lead owner inbox for the lead name between "2000-01-01" and "2000-01-31"
    Then the search results do not include the lead

  Scenario: Special characters in the search term are treated as plain text
    Given I am signed in as salesperson "A"
    When I search salesperson inbox for "%(*)[ a"
    Then the response status should be 200
    And the search response contains an items list
