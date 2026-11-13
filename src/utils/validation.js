import { CATEGORIES, OCCASIONS, STATUSES } from './constants';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmail(email) {
  return EMAIL_PATTERN.test((email || '').trim());
}

export function validateEmail(email) {
  if (!email || !email.trim()) return 'Email is required.';
  if (!isValidEmail(email)) return 'Enter a valid email address.';
  return '';
}

export function validatePassword(password) {
  if (!password) return 'Password is required.';
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return 'Password must contain at least one letter and one number.';
  }
  return '';
}

export function validateLogin({ email, password }) {
  const errors = {};
  const emailError = validateEmail(email);
  if (emailError) errors.email = emailError;
  if (!password) errors.password = 'Password is required.';
  return errors;
}

export function validateRegistration({ name, email, password, confirmPassword }) {
  const errors = {};
  if (!name || name.trim().length < 2) errors.name = 'Enter your full name (at least 2 characters).';
  const emailError = validateEmail(email);
  if (emailError) errors.email = emailError;
  const passwordError = validatePassword(password);
  if (passwordError) errors.password = passwordError;
  if (!confirmPassword) errors.confirmPassword = 'Please confirm your password.';
  else if (password !== confirmPassword) errors.confirmPassword = 'Passwords do not match.';
  return errors;
}

export function isValidImageUrl(value) {
  if (!value) return true; // optional field
  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function validateClothing(values) {
  const errors = {};
  const name = (values.itemName || '').trim();
  if (!name) errors.itemName = 'Clothing name is required.';
  else if (name.length > 100) errors.itemName = 'Name must be 100 characters or fewer.';

  if (!values.category) errors.category = 'Choose a category.';
  else if (!CATEGORIES.includes(values.category)) errors.category = 'Invalid category.';

  if (!values.color) errors.color = 'Choose a color.';
  if (!values.size) errors.size = 'Choose a size.';

  if (!values.occasion) errors.occasion = 'Choose an occasion.';
  else if (!OCCASIONS.includes(values.occasion)) errors.occasion = 'Invalid occasion.';

  if (!STATUSES.includes(values.status)) errors.status = 'Choose an availability status.';

  if ((values.brand || '').length > 60) errors.brand = 'Brand must be 60 characters or fewer.';
  if ((values.description || '').length > 1000) {
    errors.description = 'Description must be 1000 characters or fewer.';
  }

  if (values.purchaseDate) {
    const date = new Date(`${values.purchaseDate}T00:00:00`);
    if (Number.isNaN(date.getTime())) errors.purchaseDate = 'Enter a valid date.';
    else if (date.getTime() > Date.now()) errors.purchaseDate = 'Purchase date cannot be in the future.';
  }

  return errors;
}
