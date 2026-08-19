import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import api, { extractErrorMessage } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import type { KycData } from '@/types';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import type { WizardStepProps } from './wizardSteps';

const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

const kycSchema = z.object({
  applicantName: z.string().trim().min(2, 'Applicant name is required').max(150, 'Name is too long'),
  fatherSpouseName: z.string().trim().max(150, 'Name is too long'),
  gender: z.enum(['MALE', 'FEMALE'], { errorMap: () => ({ message: 'Select a gender' }) }),
  maritalStatus: z.union([z.enum(['SINGLE', 'MARRIED']), z.literal('')]),
  dob: z
    .string()
    .min(1, 'Date of birth is required')
    .refine((v) => !Number.isNaN(Date.parse(v)), 'Enter a valid date')
    .refine((v) => new Date(v) <= new Date(), 'Date of birth cannot be in the future'),
  nationality: z.string().trim().max(80, 'Nationality is too long'),
  residencyStatus: z.enum(['RESIDENT_INDIVIDUAL', 'NON_RESIDENT', 'FOREIGN_NATIONAL']),
  // Optional: left blank when unchanged, since the API returns these masked.
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
});

type KycFormValues = z.infer<typeof kycSchema>;

const EMPTY: KycFormValues = {
  applicantName: '',
  fatherSpouseName: '',
  gender: 'MALE',
  maritalStatus: '',
  dob: '',
  nationality: 'India',
  residencyStatus: 'RESIDENT_INDIVIDUAL',
  panNumber: '',
  aadhaarNumber: '',
  proofOfIdentity: 'AADHAAR',
};

const PROOF_OPTIONS: Array<[KycFormValues['proofOfIdentity'], string]> = [
  ['AADHAAR', 'Aadhaar'],
  ['PAN', 'PAN'],
  ['PASSPORT', 'Passport'],
  ['DL', 'Driving Licence'],
  ['VOTER_ID', 'Voter ID'],
  ['OTHER', 'Other'],
];

const RESIDENCY_OPTIONS: Array<[KycFormValues['residencyStatus'], string]> = [
  ['RESIDENT_INDIVIDUAL', 'Resident Individual'],
  ['NON_RESIDENT', 'Non-Resident'],
  ['FOREIGN_NATIONAL', 'Foreign National'],
];

export default function KycStep({ candidateId, onSaved, goNext }: WizardStepProps) {
  const [loading, setLoading] = useState(true);

  const form = useForm<KycFormValues>({
    resolver: zodResolver(kycSchema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get<{ data: KycData | null }>(`/candidates/${candidateId}/kyc`);
        const d = res.data.data;
        if (!cancelled && d) {
          form.reset({
            applicantName: d.applicant_name || '',
            fatherSpouseName: d.father_spouse_name || '',
            gender: d.gender || 'MALE',
            maritalStatus: d.marital_status || '',
            dob: d.dob ? d.dob.slice(0, 10) : '',
            nationality: d.nationality || 'India',
            residencyStatus: d.residency_status || 'RESIDENT_INDIVIDUAL',
            // Identity numbers come back masked, so they are never pre-filled —
            // leaving them blank keeps the stored value untouched.
            panNumber: '',
            aadhaarNumber: '',
            proofOfIdentity: d.proof_of_identity || 'AADHAAR',
          });
        }
      } catch (err) {
        if (!cancelled) toast.error(extractErrorMessage(err, 'Failed to load KYC details'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [candidateId, form]);

  const onSubmit = async (values: KycFormValues) => {
    try {
      const payload: Record<string, unknown> = { ...values };
      // Omit blank identity numbers so the server keeps whatever it already holds.
      if (!values.panNumber) delete payload.panNumber;
      if (!values.aadhaarNumber) delete payload.aadhaarNumber;

      await api.put(`/candidates/${candidateId}/kyc`, payload);
      toast.success('KYC details saved');
      await onSaved();
      goNext();
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to save KYC details'));
    }
  };

  if (loading) return <StepLoading />;

  return (
    <div>
      <StepHeading
        title="A. Identity Details (KYC)"
        description="PAN and Aadhaar are captured via manual data entry as declared by the applicant — not verified against a government database."
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="applicantName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name of Applicant *</FormLabel>
                  <FormControl>
                    <Input autoComplete="name" {...field} />
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
                  <FormDescription>
                    Manual entry. Format: 5 letters, 4 digits, 1 letter. Leave blank to keep the stored value.
                  </FormDescription>
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
                  <FormDescription>
                    Manual entry as declared by applicant — not government-verified.
                  </FormDescription>
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
                    {PROOF_OPTIONS.map(([val, lbl]) => (
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

          <StepActions>
            <Button type="submit" loading={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Saving…' : 'Save & Continue'}
            </Button>
          </StepActions>
        </form>
      </Form>
    </div>
  );
}
