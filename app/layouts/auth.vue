<template>
  <main class="relative grid min-h-screen overflow-hidden bg-stone-950 lg:grid-cols-[1.05fr_0.95fr]">
    <section class="relative hidden overflow-hidden bg-gradient-to-br from-indigo-700 to-[#263580] p-12 text-white lg:flex lg:flex-col lg:justify-between">
      <div class="absolute -right-32 -top-32 size-96 rounded-full border border-white/10" />
      <div class="absolute -bottom-48 -left-32 size-[32rem] rounded-full border border-white/10" />
      <img src="/images/cs-buu-logo.png" alt="สาขาวิชาวิทยาการคอมพิวเตอร์ มหาวิทยาลัยราชภัฏบุรีรัมย์" class="relative z-10 w-full max-w-xl object-contain object-left" >
      <div class="relative z-10 max-w-xl">
        <p class="text-sm font-semibold uppercase tracking-[0.24em] text-indigo-200">CIWIE CS</p>
        <h1 class="mt-4 text-4xl font-bold leading-tight">เชื่อมทุกขั้นตอนของ<br>สหกิจศึกษาไว้ในที่เดียว</h1>
        <p class="mt-5 max-w-lg text-base leading-7 text-indigo-100/80">ติดตามการสมัคร เอกสาร การนิเทศ และการประเมินได้อย่างเป็นระบบ สำหรับนักศึกษา อาจารย์ และผู้ดูแล</p>
      </div>
      <p class="relative z-10 text-sm text-indigo-200/70">Computer Science · Buriram Rajabhat University</p>
    </section>
    <section class="relative grid place-items-center bg-[radial-gradient(circle_at_top_right,_rgba(70,95,255,0.10),_transparent_40%)] p-4 sm:p-8 dark:bg-slate-950">
      <slot />
    </section>
  </main>
</template>
