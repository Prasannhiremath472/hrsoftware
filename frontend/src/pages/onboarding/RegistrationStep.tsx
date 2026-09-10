import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import api, { extractErrorMessage } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import type { AddressData, Candidate, Coordinator, KycData } from '@/types';

import CoordinatorCombobox from '@/components/shared/CoordinatorCombobox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

import { StepActions, StepHeading, StepLoading } from './StepShell';
import type { RegistrationStepProps } from './wizardSteps';

const MOBILE_RE = /^[6-9]\d{9}$/;
const PIN_RE = /^\d{6}$/;
const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

const schema = z
  .object({
    // ── Identity (Registration + KYC, deduplicated) ──────────────────────
    fullName: z.string().trim().min(2, 'Full name is required').max(150, 'Full name is too long'),
    mobile: z.string().trim().regex(MOBILE_RE, 'Enter a valid 10-digit mobile number'),
    email: z.union([z.string().trim().email('Enter a valid email address'), z.literal('')]),
    dob: z
      .string()
      .min(1, 'Date of birth is required')
      .refine((v) => !Number.isNaN(Date.parse(v)), 'Enter a valid date')
      .refine((v) => new Date(v) <= new Date(), 'Date of birth cannot be in the future'),
    gender: z.enum(['MALE', 'FEMALE'], { errorMap: () => ({ message: 'Select a gender' }) }),
    coordinatorId: z.string(),

    // ── KYC-only fields ───────────────────────────────────────────────────
    fatherSpouseName: z.string().trim().max(150, 'Name is too long'),
    maritalStatus: z.union([z.enum(['SINGLE', 'MARRIED']), z.literal('')]),
    nationality: z.string().trim().max(80, 'Nationality is too long'),
    residencyStatus: z.enum(['RESIDENT_INDIVIDUAL', 'NON_RESIDENT', 'FOREIGN_NATIONAL']),
    // Left blank when unchanged for an existing candidate — the API returns
    // these masked, so a blank value means "keep whatever is already stored".
    panNumber: z
      .string()
      .trim()
      .refine((v) => v === '' || PAN_RE.test(v), 'PAN must be 5 letters, 4 digits, then 1 letter'),
    aadhaarNumber: z
      .string()
      .trim()
      .refine((v) => v === '' || /^\d{12}$/.test(v), 'Aadhaar must be exactly 12 digits'),
    proofOfIdentity: z.enum(['AADHAAR', 'PAN', 'PASSPORT', 'DL', 'VOTER_ID', 'OTHER'], {
      errorMap: () => ({ message: 'Select the proof of identity submitted' }),
    }),

    // ── Address-only fields ───────────────────────────────────────────────
    residenceAddress: z.string().trim().min(5, 'Residence address is required').max(500, 'Address is too long'),
    residencePinCode: z.string().trim().regex(PIN_RE, 'PIN code must be exactly 6 digits'),
    proofOfAddress: z.enum(
      ['AADHAAR', 'PASSPORT', 'UTILITY_BILL', 'BANK_STATEMENT', 'RENT_AGREEMENT', 'OTHER'],
      { errorMap: () => ({ message: 'Select the proof of address submitted' }) }
    ),
    sameAsResidence: z.boolean(),
    permanentAddress: z.string().trim(),
    permanentPinCode: z.string().trim(),
  })
  .superRefine((values, ctx) => {
    if (values.sameAsResidence) return;
    if (values.permanentAddress.length > 0 && values.permanentAddress.length < 5) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['permanentAddress'], message: 'Permanent address is too short' });
    }
    if (values.permanentAddress.length > 500) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['permanentAddress'], message: 'Address is too long' });
    }
    if (values.permanentPinCode && !PIN_RE.test(values.permanentPinCode)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['permanentPinCode'], message: 'PIN code must be exactly 6 digits' });
    }
  });

type FormValues = z.infer<typeof schema>;

const EMPTY: FormValues = {
  fullName: '',
  mobile: '',
  email: '',
  dob: '',
  gender: 'MALE',
  coordinatorId: '',
  fatherSpouseName: '',
  maritalStatus: '',
  nationality: 'India',
  residencyStatus: 'RESIDENT_INDIVIDUAL',
  panNumber: '',
  aadhaarNumber: '',
  proofOfIdentity: 'AADHAAR',
  residenceAddress: '',
  residencePinCode: '',
  proofOfAddress: 'AADHAAR',
  sameAsResidence: true,
  permanentAddress: '',
  permanentPinCode: '',
};

const IDENTITY_PROOF_OPTIONS: Array<[FormValues['proofOfIdentity'], string]> = [
  ['AADHAAR', 'Aadhaar'],
  ['PAN', 'PAN'],
  ['PASSPORT', 'Passport'],
  ['DL', 'Driving Licence'],
  ['VOTER_ID', 'Voter ID'],
  ['OTHER', 'Other'],
];

const ADDRESS_PROOF_OPTIONS: Array<[FormValues['proofOfAddress'], string]> = [
  ['AADHAAR', 'Aadhaar'],
  ['PASSPORT', 'Passport'],
  ['UTILITY_BILL', 'Utility Bill'],
  ['BANK_STATEMENT', 'Bank Statement'],
  ['RENT_AGREEMENT', 'Rent Agreement'],
  ['OTHER', 'Other'],
];

const RESIDENCY_OPTIONS: Array<[FormValues['residencyStatus'], string]> = [
  ['RESIDENT_INDIVIDUAL', 'Resident Individual'],
  ['NON_RESIDENT', 'Non-Resident'],
  ['FOREIGN_NATIONAL', 'Foreign National'],
];

export default function RegistrationStep({ candidateId, candidate, onSaved, goNext, onCreated }: RegistrationStepProps) {
  const isNew = !candidateId;
  const [coordinators, setCoordinators] = useState<Coordinator[]>([]);
  const [loading, setLoading] = useState(!isNew);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY,
  });

  const sameAsResidence = form.watch('sameAsResidence');

  useEffect(() => {
    let cancelled = false;
    api
      .get<{ data: Coordinator[] }>('/coordinators', { params: { status: 'ACTIVE' } })
      .then((res) => {
        if (!cancelled) setCoordinators(res.data.data);
      })
      .catch((err) => {
        if (!cancelled) toast.error(extractErrorMessage(err, 'Failed to load coordinators'));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Edit mode: prefill from the existing candidate + KYC + address records.
  useEffect(() => {
    if (isNew || !candidateId || !candidate) return;
    let cancelled = false;
    (async () => {
      try {
        const [kycRes, addressRes] = await Promise.all([
          api.get<{ data: KycData | null }>(`/candidates/${candidateId}/kyc`),
          api.get<{ data: AddressData | null }>(`/candidates/${candidateId}/address`),
        ]);
        if (cancelled) return;
        const kyc = kycRes.data.data;
        const address = addressRes.data.data;
        form.reset({
          fullName: candidate.full_name || '',
          mobile: candidate.mobile || '',
          email: candidate.email || '',
          dob: candidate.dob ? candidate.dob.slice(0, 10) : '',
          gender: (candidate.gender as 'MALE' | 'FEMALE') || 'MALE',
          coordinatorId: candidate.coordinator_id ? String(candidate.coordinator_id) : '',
          fatherSpouseName: kyc?.father_spouse_name || '',
          maritalStatus: kyc?.marital_status || '',
          nationality: kyc?.nationality || 'India',
          residencyStatus: kyc?.residency_status || 'RESIDENT_INDIVIDUAL',
          // Identity numbers come back masked, so never pre-filled — leaving
          // them blank keeps the stored value untouched on save.
          panNumber: '',
          aadhaarNumber: '',
          proofOfIdentity: kyc?.proof_of_identity || 'AADHAAR',
          residenceAddress: address?.residence_address || '',
          residencePinCode: address?.residence_pin_code || '',
          proofOfAddress: address?.proof_of_address || 'AADHAAR',
          sameAsResidence: address ? Boolean(address.same_as_residence) : true,
          permanentAddress: address?.permanent_address || '',
          permanentPinCode: address?.permanent_pin_code || '',
        });
      } catch (err) {
        if (!cancelled) toast.error(extractErrorMessage(err, 'Failed to load registration details'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNew, candidateId, candidate]);

  const onSubmit = async (values: FormValues) => {
    const kycPayload: Record<string, unknown> = {
      applicantName: values.fullName,
      fatherSpouseName: values.fatherSpouseName,
      gender: values.gender,
      maritalStatus: values.maritalStatus || undefined,
      dob: values.dob,
      nationality: values.nationality,
      residencyStatus: values.residencyStatus,
      proofOfIdentity: values.proofOfIdentity,
    };
    if (values.panNumber) kycPayload.panNumber = values.panNumber;
    if (values.aadhaarNumber) kycPayload.aadhaarNumber = values.aadhaarNumber;

    const addressPayload = {
      residenceAddress: values.residenceAddress,
      residencePinCode: values.residencePinCode,
      contactEmail: values.email || undefined,
      contactMobile: values.mobile,
      proofOfAddress: values.proofOfAddress,
      sameAsResidence: values.sameAsResidence,
      permanentAddress: values.sameAsResidence ? undefined : values.permanentAddress,
      permanentPinCode: values.sameAsResidence ? undefined : values.permanentPinCode,
    };

    if (isNew) {
      let newId: number;
      try {
        const res = await api.post<{ data: Candidate }>('/candidates', {
          fullName: values.fullName,
          mobile: values.mobile,
          email: values.email || undefined,
          dob: values.dob,
          gender: values.gender,
          coordinatorId: values.coordinatorId || undefined,
        });
        newId = res.data.data.id;
      } catch (err) {
        toast.error(extractErrorMessage(err, 'Failed to register candidate'));
        return;
      }

      const results = await Promise.allSettled([
        api.put(`/candidates/${newId}/kyc`, kycPayload),
        api.put(`/candidates/${newId}/address`, addressPayload),
      ]);
      const failed = results.some((r) => r.status === 'rejected');

      if (failed) {
        toast.error('Candidate registered, but some details failed to save — you can complete them from this step.');
      } else {
        toast.success('Candidate registered');
      }
      onCreated(newId);
      return;
    }

    // Edit mode: update the existing candidate + KYC + address.
    try {
      await Promise.all([
        api.put(`/candidates/${candidateId}`, {
          fullName: values.fullName,
          mobile: values.mobile,
          email: values.email || undefined,
          dob: values.dob,
          gender: values.gender,
        }),
        api.put(`/candidates/${candidateId}/kyc`, kycPayload),
        api.put(`/candidates/${candidateId}/address`, addressPayload),
      ]);
      toast.success('Registration details saved');
      await onSaved();
      goNext();
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to save registration details'));
    }
  };

  if (loading) return <StepLoading />;

  return (
    <div>
      <StepHeading
        title="1. Registration"
        description="Identity, KYC and address details — captured together in one step."
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* ── Identity ──────────────────────────────────────────── */}
          <section className="space-y-5">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Identity Details
            </h3>

            <div className="grid gap-5 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name *</FormLabel>
                    <FormControl>
                      <Input autoComplete="name" autoFocus {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="fatherSpouseName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Father&apos;s / Spouse Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="mobile"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mobile Number *</FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        inputMode="numeric"
                        autoComplete="tel"
                        maxLength={10}
                        placeholder="10-digit mobile number"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" autoComplete="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="dob"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of Birth *</FormLabel>
                    <FormControl>
                      <Input type="date" max={new Date().toISOString().slice(0, 10)} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gender *</FormLabel>
                    <FormControl>
                      <RadioGroup className="flex flex-row gap-6 pt-1" value={field.value} onValueChange={field.onChange}>
                        {(['MALE', 'FEMALE'] as const).map((g) => (
                          <div key={g} className="flex items-center gap-2">
                            <RadioGroupItem value={g} id={`gender-${g}`} />
                            <Label htmlFor={`gender-${g}`} className="font-normal">
                              {g === 'MALE' ? 'Male' : 'Female'}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="maritalStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Marital Status</FormLabel>
                    <FormControl>
                      <RadioGroup className="flex flex-row gap-6 pt-1" value={field.value} onValueChange={field.onChange}>
                        {(['SINGLE', 'MARRIED'] as const).map((m) => (
                          <div key={m} className="flex items-center gap-2">
                            <RadioGroupItem value={m} id={`marital-${m}`} />
                            <Label htmlFor={`marital-${m}`} className="font-normal">
                              {m === 'SINGLE' ? 'Single' : 'Married'}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="nationality"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nationality</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="residencyStatus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Residency Status</FormLabel>
                  <FormControl>
                    <RadioGroup
                      className="flex flex-row flex-wrap gap-x-6 gap-y-2 pt-1"
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      {RESIDENCY_OPTIONS.map(([val, lbl]) => (
                        <div key={val} className="flex items-center gap-2">
                          <RadioGroupItem value={val} id={`res-${val}`} />
                          <Label htmlFor={`res-${val}`} className="font-normal">
                            {lbl}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-5 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="panNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>PAN Number</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="ABCDE1234F"
                        maxLength={10}
                        autoCapitalize="characters"
                        className="font-mono uppercase"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                      />
                    </FormControl>
                    <FormDescription>Manual entry. Format: 5 letters, 4 digits, 1 letter.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="aadhaarNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Aadhaar Number</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="12 digit number"
                        maxLength={12}
                        inputMode="numeric"
                        className="font-mono"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value.replace(/\D/g, ''))}
                      />
                    </FormControl>
                    <FormDescription>Manual entry as declared by applicant — not government-verified.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="proofOfIdentity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Proof of Identity Submitted *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="sm:max-w-xs">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {IDENTITY_PROOF_OPTIONS.map(([val, lbl]) => (
                        <SelectItem key={val} value={val}>
                          {lbl}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="coordinatorId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Coordinator</FormLabel>
                  <FormControl>
                    <CoordinatorCombobox coordinators={coordinators} value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormDescription>Only active coordinators are shown. This can be changed later.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </section>

          <Separator />

          {/* ── Address ───────────────────────────────────────────── */}
          <section className="space-y-5">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Address Details
            </h3>

            <FormField
              control={form.control}
              name="residenceAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Residence Address *</FormLabel>
                  <FormControl>
                    <Textarea rows={3} autoComplete="street-address" maxLength={500} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-5 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="residencePinCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pin Code *</FormLabel>
                    <FormControl>
                      <Input
                        inputMode="numeric"
                        autoComplete="postal-code"
                        className="tabular"
                        maxLength={6}
                        placeholder="6-digit PIN code"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="proofOfAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Proof of Address Submitted *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ADDRESS_PROOF_OPTIONS.map(([val, lbl]) => (
                          <SelectItem key={val} value={val}>
                            {lbl}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <p className="text-sm text-muted-foreground">
              Contact mobile and email for this address reuse the Mobile Number and Email captured above.
            </p>

            <Separator />

            <FormField
              control={form.control}
              name="sameAsResidence"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-2.5">
                    <FormControl>
                      <Checkbox
                        id="sameAsResidence"
                        checked={field.value}
                        onCheckedChange={(v) => field.onChange(Boolean(v))}
                      />
                    </FormControl>
                    <Label htmlFor="sameAsResidence" className="font-normal">
                      Permanent address same as residence address
                    </Label>
                  </div>
                </FormItem>
              )}
            />

            {!sameAsResidence && (
              <div className="space-y-5">
                <FormField
                  control={form.control}
                  name="permanentAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Permanent Address</FormLabel>
                      <FormControl>
                        <Textarea rows={3} maxLength={500} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="permanentPinCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Permanent Pin Code</FormLabel>
                      <FormControl>
                        <Input
                          inputMode="numeric"
                          className="tabular sm:max-w-xs"
                          maxLength={6}
                          placeholder="6-digit PIN code"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
          </section>

          <StepActions>
            <Button type="submit" loading={form.formState.isSubmitting}>
              {form.formState.isSubmitting
                ? 'Saving…'
                : isNew
                  ? 'Register & Continue to Documents'
                  : 'Save & Continue'}
            </Button>
          </StepActions>
        </form>
      </Form>
    </div>
  );
}
