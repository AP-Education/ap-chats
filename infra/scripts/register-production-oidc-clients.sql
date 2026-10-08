-- Run in the production backend-LMS database, which owns Accounts clients.
-- The application_id below must already exist in applications.
BEGIN;

INSERT INTO oidc_clients (
    client_id,
    application_id,
    name,
    redirect_uris,
    post_logout_redirect_uris,
    grant_types,
    response_types,
    token_endpoint_auth_method,
    resource,
    application_type,
    updated_at
) VALUES
    (
        'lms-web',
        '6e8c8a93-d26b-4f2d-8d40-8bc9f31f2b02',
        'LMS web client',
        ARRAY['https://ap-platform.online/auth/callback'],
        ARRAY['https://ap-platform.online'],
        ARRAY['authorization_code'],
        ARRAY['code'],
        'none',
        'https://api.ap-platform.online',
        'WEB',
        now()
    ),
    (
        'ap-chats-web',
        '6e8c8a93-d26b-4f2d-8d40-8bc9f31f2b02',
        'AP Chats web client',
        ARRAY['https://chats.ap-platform.online/auth/callback'],
        ARRAY['https://chats.ap-platform.online'],
        ARRAY['authorization_code'],
        ARRAY['code'],
        'none',
        'https://chats.ap-platform.online',
        'WEB',
        now()
    ),
    (
        'ap-chats-mobile',
        '6e8c8a93-d26b-4f2d-8d40-8bc9f31f2b02',
        'AP Chats mobile client',
        ARRAY['apchats://auth/callback'],
        ARRAY['apchats://auth/callback'],
        ARRAY['authorization_code'],
        ARRAY['code'],
        'none',
        'https://chats.ap-platform.online',
        'NATIVE',
        now()
    )
ON CONFLICT (client_id) DO UPDATE SET
    application_id = EXCLUDED.application_id,
    name = EXCLUDED.name,
    redirect_uris = EXCLUDED.redirect_uris,
    post_logout_redirect_uris = EXCLUDED.post_logout_redirect_uris,
    grant_types = EXCLUDED.grant_types,
    response_types = EXCLUDED.response_types,
    token_endpoint_auth_method = EXCLUDED.token_endpoint_auth_method,
    resource = EXCLUDED.resource,
    application_type = EXCLUDED.application_type,
    updated_at = EXCLUDED.updated_at
RETURNING client_id, application_id, redirect_uris, post_logout_redirect_uris,
          resource, application_type;

COMMIT;
