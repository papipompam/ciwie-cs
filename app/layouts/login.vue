<template>
  <div class="grid min-h-dvh w-full overflow-hidden bg-canvas lg:grid-cols-2">
    <section class="relative hidden min-h-dvh overflow-hidden bg-sidebar px-12 py-10 lg:flex lg:items-center xl:px-20" aria-labelledby="login-welcome-title">
      <div class="pointer-events-none absolute -left-20 -top-24 size-72 rounded-full bg-primary/20 blur-3xl" />
      <div class="pointer-events-none absolute -bottom-24 right-0 size-96 rounded-full bg-primary/10 blur-3xl" />
      <div class="pointer-events-none absolute left-12 top-12 size-2 rounded-full bg-primary/70" />
      <div class="pointer-events-none absolute bottom-20 left-1/3 size-3 rounded-full border border-primary/40" />

      <div class="relative z-10 max-w-xl pr-14">
        <p class="text-lg font-bold tracking-[0.18em] text-primary">CWIE BRU</p>
        <p class="mt-6 text-xl font-semibold leading-9 text-white xl:text-2xl">ระบบบริหารจัดการการนิเทศสหกิจศึกษา</p>
        <p class="mt-4 max-w-lg text-sm leading-7 text-white/65 xl:text-base">จัดการคำร้อง ติดตามการปฏิบัติงาน และวางแผนการนิเทศสหกิจศึกษาได้ในระบบเดียว</p>
      </div>
    </section>

    <main class="relative flex min-h-dvh items-center justify-center bg-canvas px-5 py-8 sm:px-8 lg:px-14 xl:px-20">
      <svg class="pointer-events-none absolute inset-y-0 left-px hidden h-full w-24 -translate-x-full text-canvas lg:block" viewBox="0 0 96 800" preserveAspectRatio="none" aria-hidden="true">
        <path fill="currentColor" d="M96 0H42C34 82 18 135 35 193C55 262 8 315 28 377C46 432 65 469 32 532C5 585 32 651 46 694C57 729 43 767 55 800H96V0Z" />
      </svg>
      <div class="relative z-10 w-full max-w-lg"><slot /></div>
      <ClientOnly><AppToaster /></ClientOnly>
    </main>
  </div>
</template>
