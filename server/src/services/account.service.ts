/**
 * What a customer can change about themselves (S-12): their name and phone, their addresses, and their
 * password. Not their email — that identifies every order they have ever placed, and the model, the schema
 * hooks and the route all refuse it (AC2.1).
 *
 * Every change writes an audit row with the fields that moved.
 */

import {
  MAX_ADDRESSES,
  type Address,
  type AddressInput,
  type ChangePasswordInput,
  type Customer as CustomerDto,
  type ProfileInput,
} from "@aib/shared";
import type { Request } from "express";
import { AppError } from "../lib/app-error.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import { Customer, type AddressDoc, type CustomerDoc } from "../models/index.js";
import { recordAudit } from "./audit.service.js";
import { toCustomerDto } from "./auth.service.js";

async function loadCustomer(customerId: string): Promise<CustomerDoc & { save: () => Promise<unknown> }> {
  const customer = await Customer.findById(customerId).exec();
  if (!customer) {
    throw new AppError(401, "UNAUTHENTICATED", "Please sign in to continue.");
  }
  return customer as CustomerDoc & { save: () => Promise<unknown> };
}

function toAddressDto(address: AddressDoc): Address {
  return {
    id: address._id.toString(),
    label: address.label,
    fullName: address.fullName,
    phone: address.phone,
    line1: address.line1,
    line2: address.line2,
    city: address.city,
    state: address.state as Address["state"],
    landmark: address.landmark,
    isDefault: address.isDefault,
  };
}

export async function updateProfile(
  customerId: string,
  input: ProfileInput,
  req?: Request,
): Promise<CustomerDto> {
  const customer = await loadCustomer(customerId);
  const before = { firstName: customer.firstName, lastName: customer.lastName, phone: customer.phone };

  customer.firstName = input.firstName;
  customer.lastName = input.lastName;
  customer.phone = input.phone ?? "";
  await customer.save();

  await recordAudit({
    actorType: "CUSTOMER",
    actor: customer._id,
    actorName: `${customer.firstName} ${customer.lastName}`,
    action: "CUSTOMER_PROFILE_UPDATED",
    entityType: "Customer",
    entityId: customer._id,
    summary: "Updated their profile",
    before,
    after: { firstName: customer.firstName, lastName: customer.lastName, phone: customer.phone },
    ...(req ? { req } : {}),
  });

  return toCustomerDto(customer);
}

/**
 * Changing a password ends every other session: `tokenVersion` goes up, and every request carrying a token
 * signed against the old number is refused from then on. The caller re-issues this session's cookie.
 */
export async function changePassword(
  customerId: string,
  input: ChangePasswordInput,
  req?: Request,
): Promise<{ customer: CustomerDoc; dto: CustomerDto }> {
  const customer = await loadCustomer(customerId);

  if (!(await verifyPassword(input.currentPassword, customer.passwordHash))) {
    throw new AppError(400, "WRONG_PASSWORD", "That is not your current password.", [
      { path: "currentPassword", message: "That is not your current password" },
    ]);
  }

  if (await verifyPassword(input.newPassword, customer.passwordHash)) {
    throw new AppError(400, "PASSWORD_UNCHANGED", "Choose a password you have not used here before.", [
      { path: "newPassword", message: "This is your current password" },
    ]);
  }

  customer.passwordHash = await hashPassword(input.newPassword);
  customer.tokenVersion += 1;
  await customer.save();

  await recordAudit({
    actorType: "CUSTOMER",
    actor: customer._id,
    actorName: `${customer.firstName} ${customer.lastName}`,
    action: "CUSTOMER_PASSWORD_CHANGED",
    entityType: "Customer",
    entityId: customer._id,
    summary: "Changed their password; other sessions were signed out",
    ...(req ? { req } : {}),
  });

  return { customer, dto: toCustomerDto(customer) };
}

export async function listAddresses(customerId: string): Promise<Address[]> {
  const customer = await loadCustomer(customerId);
  return customer.addresses.map(toAddressDto);
}

export async function addAddress(customerId: string, input: AddressInput, req?: Request): Promise<Address[]> {
  const customer = await loadCustomer(customerId);

  if (customer.addresses.length >= MAX_ADDRESSES) {
    throw new AppError(
      409,
      "TOO_MANY_ADDRESSES",
      `You can keep up to ${MAX_ADDRESSES} addresses. Delete one to add another.`,
    );
  }

  // The first address a customer saves is their default, whatever the form said.
  const isDefault = input.isDefault === true || customer.addresses.length === 0;
  if (isDefault) {
    for (const address of customer.addresses) {
      address.isDefault = false;
    }
  }

  customer.addresses.push({
    label: input.label ?? "",
    fullName: input.fullName,
    phone: input.phone,
    line1: input.line1,
    line2: input.line2 ?? "",
    city: input.city,
    state: input.state,
    landmark: input.landmark ?? "",
    isDefault,
  } as AddressDoc);
  await customer.save();

  const added = customer.addresses[customer.addresses.length - 1];
  await recordAudit({
    actorType: "CUSTOMER",
    actor: customer._id,
    actorName: `${customer.firstName} ${customer.lastName}`,
    action: "CUSTOMER_ADDRESS_ADDED",
    entityType: "Customer",
    entityId: customer._id,
    summary: `Added an address in ${input.city}, ${input.state}`,
    after: added ? toAddressDto(added) : undefined,
    ...(req ? { req } : {}),
  });

  return customer.addresses.map(toAddressDto);
}

export async function updateAddress(
  customerId: string,
  addressId: string,
  input: AddressInput,
  req?: Request,
): Promise<Address[]> {
  const customer = await loadCustomer(customerId);
  const address = customer.addresses.find((candidate) => candidate._id.toString() === addressId);
  if (!address) {
    throw AppError.notFound("That address is not in your address book.");
  }

  const before = toAddressDto(address);

  if (input.isDefault === true) {
    for (const other of customer.addresses) {
      other.isDefault = false;
    }
  }

  address.label = input.label ?? "";
  address.fullName = input.fullName;
  address.phone = input.phone;
  address.line1 = input.line1;
  address.line2 = input.line2 ?? "";
  address.city = input.city;
  address.state = input.state;
  address.landmark = input.landmark ?? "";
  address.isDefault = input.isDefault === true || before.isDefault;
  await customer.save();

  await recordAudit({
    actorType: "CUSTOMER",
    actor: customer._id,
    actorName: `${customer.firstName} ${customer.lastName}`,
    action: "CUSTOMER_ADDRESS_UPDATED",
    entityType: "Customer",
    entityId: customer._id,
    summary: `Updated the address in ${address.city}`,
    before,
    after: toAddressDto(address),
    ...(req ? { req } : {}),
  });

  return customer.addresses.map(toAddressDto);
}

export async function deleteAddress(
  customerId: string,
  addressId: string,
  req?: Request,
): Promise<Address[]> {
  const customer = await loadCustomer(customerId);
  const address = customer.addresses.find((candidate) => candidate._id.toString() === addressId);
  if (!address) {
    throw AppError.notFound("That address is not in your address book.");
  }

  const removed = toAddressDto(address);
  customer.addresses = customer.addresses.filter((candidate) => candidate._id.toString() !== addressId);

  // Deleting the default promotes whatever is left, so checkout always has one to offer.
  if (removed.isDefault && customer.addresses[0]) {
    customer.addresses[0].isDefault = true;
  }
  await customer.save();

  await recordAudit({
    actorType: "CUSTOMER",
    actor: customer._id,
    actorName: `${customer.firstName} ${customer.lastName}`,
    action: "CUSTOMER_ADDRESS_DELETED",
    entityType: "Customer",
    entityId: customer._id,
    summary: `Deleted the address in ${removed.city}`,
    before: removed,
    ...(req ? { req } : {}),
  });

  return customer.addresses.map(toAddressDto);
}

export async function setDefaultAddress(
  customerId: string,
  addressId: string,
  req?: Request,
): Promise<Address[]> {
  const customer = await loadCustomer(customerId);
  const address = customer.addresses.find((candidate) => candidate._id.toString() === addressId);
  if (!address) {
    throw AppError.notFound("That address is not in your address book.");
  }

  for (const other of customer.addresses) {
    other.isDefault = other._id.toString() === addressId;
  }
  await customer.save();

  await recordAudit({
    actorType: "CUSTOMER",
    actor: customer._id,
    actorName: `${customer.firstName} ${customer.lastName}`,
    action: "CUSTOMER_DEFAULT_ADDRESS_SET",
    entityType: "Customer",
    entityId: customer._id,
    summary: `Made the ${address.city} address their default`,
    ...(req ? { req } : {}),
  });

  return customer.addresses.map(toAddressDto);
}
