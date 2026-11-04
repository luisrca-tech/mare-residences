"use client";

import { Dialog } from "@base-ui/react/dialog";
import Link from "next/link";
import { useRef } from "react";
import { content } from "@/data/content";

export function MobileNavigation() {
  const closeRef = useRef<HTMLButtonElement>(null);
  const { navigation, brand, headerCta, menu } = content.shared;

  return (
    <Dialog.Root>
      <Dialog.Trigger className="type-menu-trigger flex min-h-11 w-24 cursor-pointer items-center whitespace-pre-wrap text-left lg:hidden">
        {menu.openLabel}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Viewport
          data-lenis-prevent=""
          className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-petrol"
        >
          <Dialog.Popup
            initialFocus={closeRef}
            className="mx-auto flex min-h-svh w-full max-w-[1440px] flex-col gap-14 px-6 pt-6 pb-12 text-ivory outline-none max-[359px]:px-4"
          >
            <Dialog.Title className="sr-only">{menu.title}</Dialog.Title>
            <div className="relative flex min-h-[41px] items-start justify-between gap-6">
              <Dialog.Close
                role="link"
                nativeButton={false}
                render={<Link href="/" prefetch={false} />}
                className="type-menu-brand w-[170px]"
                aria-label="Maré — Home"
              >
                {brand.wordmark}
              </Dialog.Close>
              <Dialog.Close
                ref={closeRef}
                className="type-nav absolute top-0 right-0 flex min-h-11 w-[100px] cursor-pointer items-start whitespace-pre-wrap text-left"
              >
                {menu.closeLabel}
              </Dialog.Close>
            </div>
            <nav aria-label={menu.title} className="flex flex-col gap-6">
              {navigation.map((item) => (
                <Dialog.Close
                  role="link"
                  key={item.href}
                  nativeButton={false}
                  render={<Link href={item.href} prefetch={false} />}
                  className="type-menu block"
                >
                  {item.label}
                </Dialog.Close>
              ))}
            </nav>
            <Dialog.Close
              role="link"
              nativeButton={false}
              render={<Link href={headerCta.href} prefetch={false} />}
              className="type-button flex min-h-[52px] items-center bg-ivory px-5 text-petrol"
            >
              {headerCta.label}
            </Dialog.Close>
            <Dialog.Close
              role="link"
              nativeButton={false}
              render={<Link href="/privacidade" prefetch={false} />}
              className="type-nav flex min-h-11 items-start"
            >
              Privacidade
            </Dialog.Close>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
