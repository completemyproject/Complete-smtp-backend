export async function appendCustomerEnquiry({
  enquiryId,
  name,
  email,
  phone,
  postcode,
  projectType,
  description,
  marketingOptIn,
}) {
  const url = process.env.GOOGLE_APPS_SCRIPT_URL?.trim();

  if (!url) {
    throw new Error('GOOGLE_APPS_SCRIPT_URL is missing');
  }

  const payload = {
    enquiryId: enquiryId ?? '',
    name: name ?? '',
    email: email ?? '',
    phone: phone ?? '',
    postcode: postcode ?? '',
    projectType: projectType ?? '',
    description: description ?? '',
    marketingOptIn: Boolean(marketingOptIn),
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const data = await res.json().catch(() => null);

    if (!res.ok || !data?.ok) {
      throw new Error(
        `Apps Script failed: HTTP ${res.status} | ${JSON.stringify(data)}`
      );
    }

    return data;
  } finally {
    clearTimeout(timeout);
  }
}

export async function updateEnquiryStatus({ enquiryId, status }) {
  const url = process.env.GOOGLE_APPS_SCRIPT_URL?.trim();

  if (!url) {
    throw new Error('GOOGLE_APPS_SCRIPT_URL is missing');
  }

  const payload = {
    action: 'update_status',
    enquiryId: enquiryId ?? '',
    status: status ?? '',
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const data = await res.json().catch(() => null);

    if (!res.ok || !data?.ok) {
      throw new Error(
        `Apps Script failed: HTTP ${res.status} | ${JSON.stringify(data)}`
      );
    }

    return data;
  } finally {
    clearTimeout(timeout);
  }
}
