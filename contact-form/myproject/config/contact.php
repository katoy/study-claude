<?php

return [
    'confirmation_rate_limit' => (int) env('CONTACT_CONFIRMATION_RATE_LIMIT', 30),
    'submission_rate_limit' => (int) env('CONTACT_SUBMISSION_RATE_LIMIT', 5),
    'export_limit' => (int) env('CONTACT_EXPORT_LIMIT', 10000),
];
