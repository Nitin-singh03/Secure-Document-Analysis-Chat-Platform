export const EMAIL_VERIFY_TEMPLATE = `
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta charset="utf-8" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Email Verify</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet" type="text/css">
  <style>
    /* Reset */
    html,body{margin:0;padding:0;height:100%;background:#F3F6F8;font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;}
    table{border-collapse:collapse;border-spacing:0}
    img{border:0;display:block;max-width:100%}
    a{color:inherit;text-decoration:none}
    /* Layout */
    .wrapper{width:100%;padding:32px 16px;background:#F3F6F8}
    .card{max-width:560px;margin:36px auto;background:#ffffff;border-radius:12px;box-shadow:0 8px 20px rgba(20,30,40,0.06);overflow:hidden}
    .card-inner{padding:40px 44px;color:#0b1721}
    h1{font-size:20px;margin:0 0 12px;color:#0f1724;font-weight:700}
    .lead{margin:0 0 16px;font-size:14px;line-height:1.5;color:#28323a}
    .muted{font-size:13px;color:#6b7280;margin:0 0 18px}
    .otp-wrap{margin:18px 0 26px}
    .otp{display:inline-block;padding:14px 20px;border-radius:10px;background:linear-gradient(180deg,#f6fff7,#eaf9ee);font-weight:700;font-size:22px;letter-spacing:4px;border:1px solid #e2f3e7;color:#0b3b24}
    .cta{display:inline-block;padding:12px 18px;border-radius:10px;background:#22D172;color:#fff;font-weight:700;font-size:14px;text-align:center}
    .note{font-size:13px;color:#556066;margin-top:12px}
    .footer{padding:20px 28px;background:#fbfdfe;text-align:center;font-size:12px;color:#8b949a}
    /* responsive */
    @media (max-width:480px){
      .card-inner{padding:28px 20px}
      .otp{font-size:20px;padding:12px 16px;letter-spacing:3px}
      .cta{display:block;width:100%}
    }
  </style>
</head>
<body>
  <table class="wrapper" width="100%" role="presentation">
    <tr>
      <td align="center">
        <table class="card" role="presentation" width="100%">
          <tr>
            <td class="card-inner">
              <h1>Verify your email</h1>

              <p class="lead">
                You are just one step away to verify your account for this email:
                <span style="color:#4C83EE;font-weight:600;">{{email}}</span>.
              </p>

              <p class="muted" style="font-weight:600">Use below OTP to verify your account.</p>

              <div class="otp-wrap">
                <span class="otp" role="text" aria-label="One time password">{{otp}}</span>
              </div>

              <p class="note">This OTP is valid for 10 minutes.</p>
            </td>
          </tr>

          <tr>
            <td class="footer">
              If you didn't request this, please ignore this email.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;


export const PASSWORD_RESET_TEMPLATE = `
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta charset="utf-8" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Password Reset</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet" type="text/css">
  <style>
    /* Reset */
    html,body{margin:0;padding:0;height:100%;background:#F3F6F8;font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;}
    table{border-collapse:collapse;border-spacing:0}
    img{border:0;display:block;max-width:100%}
    a{color:inherit;text-decoration:none}
    /* Layout */
    .wrapper{width:100%;padding:32px 16px;background:#F3F6F8}
    .card{max-width:560px;margin:36px auto;background:#ffffff;border-radius:12px;box-shadow:0 8px 20px rgba(20,30,40,0.06);overflow:hidden}
    .card-inner{padding:40px 44px;color:#0b1721}
    h1{font-size:20px;margin:0 0 12px;color:#0f1724;font-weight:700}
    .lead{margin:0 0 16px;font-size:14px;line-height:1.5;color:#28323a}
    .muted{font-size:13px;color:#6b7280;margin:0 0 18px}
    .otp-wrap{margin:18px 0 26px}
    .otp{display:inline-block;padding:14px 20px;border-radius:10px;background:linear-gradient(180deg,#fff8f2,#fff0e3);font-weight:700;font-size:22px;letter-spacing:4px;border:1px solid #fde6cf;color:#7a3b08}
    .cta{display:inline-block;padding:12px 18px;border-radius:10px;background:#FF8A3D;color:#fff;font-weight:700;font-size:14px;text-align:center}
    .note{font-size:13px;color:#55606e;margin-top:12px}
    .footer{padding:20px 28px;background:#fbfdfe;text-align:center;font-size:12px;color:#8b949a}
    /* responsive */
    @media (max-width:480px){
      .card-inner{padding:28px 20px}
      .otp{font-size:20px;padding:12px 16px;letter-spacing:3px}
      .cta{display:block;width:100%}
    }
  </style>
</head>
<body>
  <table class="wrapper" width="100%" role="presentation">
    <tr>
      <td align="center">
        <table class="card" role="presentation" width="100%">
          <tr>
            <td class="card-inner">
              <h1>Forgot your password?</h1>

              <p class="lead">
                We received a password reset request for your account:
                <span style="color:#4C83EE;font-weight:600;">{{email}}</span>.
              </p>

              <p class="muted" style="font-weight:600">Use the OTP below to reset the password.</p>

              <div class="otp-wrap">
                <span class="otp" role="text" aria-label="Password reset OTP">{{otp}}</span>
              </div>

              <p class="note">The password reset otp is only valid for the next 15 minutes.</p>
            </td>
          </tr>

          <tr>
            <td class="footer">
              If you didn't request a password reset, please ignore this email.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
