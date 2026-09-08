<template>
  <div class="min-h-dvh bg-surface">
    <main class="mx-auto flex min-h-dvh w-full max-w-6xl items-center justify-center p-4 sm:p-6 lg:p-8">
      <div class="grid w-full overflow-hidden rounded-panel border border-divider bg-canvas shadow-panel lg:grid-cols-[0.85fr_1.15fr]">
        <section class="hidden bg-sidebar p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div>
            <p class="text-sm font-semibold tracking-wide text-primary">CWIE BRU</p>
            <p class="mt-2 text-xl font-bold tracking-wide">ระบบบริหารจัดการการนิเทศสหกิจศึกษา</p>
            <p class="mt-2 max-w-sm text-sm leading-7 text-white/65">ติดตามการสมัคร จัดการคำร้อง และวางแผนการนิเทศงานสหกิจศึกษา</p>
          </div>
          <p class="text-xs leading-6 text-white/50">เข้าใช้งานตามสิทธิ์ของเจ้าหน้าที่ อาจารย์ และนักศึกษา</p>
        </section>
        <section class="p-5 sm:p-8 lg:p-10"><slot /></section>
      </div>
    </main>
    <ClientOnly><AppToaster /></ClientOnly>
  </div>
</template>
