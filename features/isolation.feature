Feature: Cross-tenant isolation
  The six cross-tenant attacks from OTOMIX 10.5 must all be rejected.

  Scenario: Forged tenant_id parameter
    Given a request for tenant "B" with header tenant_id "A"
    Then the system rejects with 403
    And no data from tenant "A" is returned

  Scenario: Cross-tenant token replay
    Given a token issued to tenant "A"
    When the token is used to access tenant "B" resources
    Then the system rejects with 401

  Scenario: Direct SQL as the application role
    Given the application role "app_rw"
    When the role attempts a cross-tenant SELECT
    Then row-level security returns zero rows

  Scenario: Cache-key collision probe
    Given tenant "A" cached a logical key
    When tenant "B" requests the same logical key
    Then tenant "B" receives a different cache entry

  Scenario: Unmounted-route access
    Given a route that is not mounted
    When the client requests the route
    Then the system returns 404

  Scenario: Forbidden scope issuance
    Given a token request for scope "admin:all" from tenant "A"
    Then the issuer rejects with 403