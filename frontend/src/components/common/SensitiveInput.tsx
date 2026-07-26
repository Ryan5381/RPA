import React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SensitiveInputProps extends Omit<React.ComponentProps<typeof Input>, "type" | "value"> {
  containerClassName?: string;
  value?: string;
  /** 永遠保留顯示的前綴字數，其餘一律用 * 遮蔽（預設 4） */
  visibleChars?: number;
}

const maskValue = (value: string, visibleChars: number): string => {
  if (value.length <= visibleChars) return value;
  return value.slice(0, visibleChars) + "*".repeat(value.length - visibleChars);
};

const commonPrefixLength = (a: string, b: string): number => {
  const max = Math.min(a.length, b.length);
  let i = 0;
  while (i < max && a[i] === b[i]) i++;
  return i;
};

const commonSuffixLength = (a: string, b: string, maxLen: number): number => {
  let i = 0;
  while (i < maxLen && a[a.length - 1 - i] === b[b.length - 1 - i]) i++;
  return i;
};

/**
 * 個資遮蔽輸入框：畫面上永遠只顯示前 N 碼、其餘一律是 *（不管有沒有游標在裡面），
 * 但底層仍然是可以正常輸入/刪除/貼上的欄位——做法是比對「遮蔽後字串」在這次
 * 編輯前後的共同前綴／後綴，反推使用者實際打了什麼字，再套用到真正的原始值上，
 * 而不是直接把畫面上打的字當成真正的值。
 */
export const SensitiveInput: React.FC<SensitiveInputProps> = ({
  className,
  containerClassName,
  visibleChars = 4,
  value,
  onChange,
  ...props
}) => {
  const rawValue = value ?? "";
  const displayValue = maskValue(rawValue, visibleChars);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDisplay = e.target.value;
    const oldDisplay = displayValue;

    const prefixLen = commonPrefixLength(oldDisplay, newDisplay);
    const maxSuffixLen = Math.min(oldDisplay.length, newDisplay.length) - prefixLen;
    const suffixLen = commonSuffixLength(oldDisplay, newDisplay, maxSuffixLen);

    const insertedSegment = newDisplay.slice(prefixLen, newDisplay.length - suffixLen);
    const rawPrefix = rawValue.slice(0, prefixLen);
    const rawSuffix = suffixLen > 0 ? rawValue.slice(rawValue.length - suffixLen) : "";
    const newRawValue = rawPrefix + insertedSegment + rawSuffix;

    onChange?.({
      target: { value: newRawValue },
      currentTarget: { value: newRawValue },
    } as React.ChangeEvent<HTMLInputElement>);
  };

  return (
    <div className={cn("relative", containerClassName)}>
      <Input
        type="text"
        value={displayValue}
        onChange={handleChange}
        className={className}
        {...props}
      />
    </div>
  );
};
