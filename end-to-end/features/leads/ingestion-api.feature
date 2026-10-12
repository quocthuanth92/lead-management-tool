@us6 @api
Feature: Lead ingestion via the internal API
  As an internal integration
  I want to submit leads with the ingestion key
  So that new enquiries reach the assigned salesperson

  Scenario: Internal API accepts a lead sent with the ingestion key
    When I submit a lead through the internal API with the ingestion key
    Then the response status should be 201
    And the response contains an id

  Scenario: Internal API rejects a lead sent without the ingestion key
    When I submit a lead through the internal API without the ingestion key
    Then the response status should be 401

  Scenario: Internal API rejects an invalid lead payload
    When I submit an invalid lead through the internal API with the ingestion key
    Then the response status should be 400
    And the response error shape is returned

  Scenario: Ingested lead appears unread in the assigned inbox only
    When I submit a lead through the internal API with the ingestion key
    Then the lead is listed unread in the inbox of its assigned salesperson
    And the lead is not visible to the other salesperson
