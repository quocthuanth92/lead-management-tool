@us3 @api
Feature: Lead activity notes
  As a salesperson
  I want to log follow-up notes on a lead
  So that the history of contact is kept in order

  Scenario: Two notes are listed newest first
    Given a new lead is ingested through the internal API
    And I am signed in as the lead owner
    When I add the activity note "First call" to the lead
    And I add the activity note "Second call" to the lead
    Then the response status should be 201
    And the lead activities are listed newest first with "Second call" before "First call"

  Scenario: An empty note is rejected
    Given a new lead is ingested through the internal API
    And I am signed in as the lead owner
    When I add the activity note "   " to the lead
    Then the response status should be 400

  Scenario: Notes cannot be edited or deleted
    Given a new lead is ingested through the internal API
    And I am signed in as the lead owner
    And I add the activity note "Immutable note" to the lead
    When I try to edit the first activity of the lead
    Then the request is refused as not found or not allowed
    When I try to delete the first activity of the lead
    Then the request is refused as not found or not allowed

  Scenario: Adding a note moves an already read lead to the top of the read leads
    Given a new lead is ingested through the internal API
    And I am signed in as the lead owner
    And I open the lead details
    When I add the activity note "Follow-up" to the lead
    Then the response status should be 201
    And the lead is the first read lead in the inbox of its salesperson
    And the lead last update is later than before the note
