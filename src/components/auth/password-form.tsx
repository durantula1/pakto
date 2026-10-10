"use client";
import { useActionState } from "react";
import Link from "next/link";
import { authInputClass } from "@/components/auth/auth-heading";
import { requestPasswordResetAction, updatePasswordAction } from "@/modules/auth/actions";
export function PasswordForm({mode,token}:{mode:"request"|"update";token?:string}){const[actionState,action,pending]=useActionState(mode==="request"?requestPasswordResetAction:updatePasswordAction,{});
  const backToSignIn=mode==="request"?<p className="text-center text-sm text-muted-foreground"><Link href="/sign-in" className="font-semibold text-foreground underline underline-offset-4">Обратно към вход</Link></p>:null;
  // Once the link is sent the form has done its job: only the answer and the way back stay, so it is not sent twice.
  if(actionState.message)return <div className="space-y-4"><div role="status" className="rounded-xl bg-tile-mint px-4 py-3.5 text-sm text-tile-mint-foreground"><p className="font-semibold">Провери имейла си</p><p className="mt-1">{actionState.message} Провери и папката за спам.</p></div>{backToSignIn}</div>;
  return <form noValidate action={action} className="space-y-4">{token?<input type="hidden" name="token" value={token}/>:null}<label className="block text-sm font-medium">{mode==="request"?"Имейл":"Нова парола"}<input name={mode==="request"?"email":"password"} type={mode==="request"?"email":"password"} required minLength={mode==="update"?8:undefined} className={authInputClass}/></label>{actionState.error&&<p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{actionState.error}</p>}<button disabled={pending} className="h-11 w-full rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60">{pending?"Изпращане…":mode==="request"?"Изпрати линк":"Запази новата парола"}</button>{backToSignIn}</form>}
