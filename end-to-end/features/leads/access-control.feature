@sec @api
Feature: Access control on lead endpoints
  As the operator of the lead service
  I want every lead endpoint to require a valid salesperson token
  So that lead data is only visible to the salesperson it belongs to

  Scenario: Requests without a token are rejected
    Given a new lead is ingested through the internal API
    When I request the inbox without a token
    Then the response status should be 401
    When I open the lead details without a token
    Then the response status should be 401

  Scenario: Invalid tokens are rejected
    When I request the inbox with the token "not-a-jwt"
    Then the response status should be 401

  Scenario: Expired tokens are rejected
    When I request the inbox with an expired token
    Then the response status should be 401

  Scenario: The ingestion key does not grant access to lead data
    Given a new lead is ingested through the internal API
    When I request the inbox with the ingestion key as the credential
    Then the response status should be 401
