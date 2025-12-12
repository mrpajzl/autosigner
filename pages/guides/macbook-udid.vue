<template>
  <div class="mt-10 px-5 max-w-4xl mx-auto space-y-8 pb-16">
    <!-- Header -->
    <div class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-600/80 via-zinc-700/90 to-neutral-800 p-8 border border-white/10">
      <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-400/10 via-transparent to-transparent"></div>
      <div class="absolute top-4 right-4 opacity-20">
        <UIcon name="i-heroicons-computer-desktop" class="w-24 h-24 text-white" />
      </div>
      <div class="relative space-y-4">
        <div class="flex items-center gap-2 text-slate-300 text-sm font-medium">
          <UIcon name="i-heroicons-book-open" class="w-4 h-4" />
          <span>Návod</span>
        </div>
        <h1 class="text-3xl md:text-4xl font-bold text-white">
          Jak zjistit UDID MacBooku
        </h1>
        <p class="text-lg text-white/70 max-w-2xl">
          Průvodce získáním Hardware UUID (UDID) vašeho MacBooku pro registraci ve FastSigner
        </p>
      </div>
    </div>

    <!-- What is UDID -->
    <div class="rounded-xl bg-blue-500/10 dark:bg-blue-500/20 border border-blue-500/20 p-6">
      <div class="flex items-start gap-4">
        <div class="p-2 rounded-lg bg-blue-500/20">
          <UIcon name="i-heroicons-information-circle" class="w-6 h-6 text-blue-500" />
        </div>
        <div class="space-y-2">
          <h3 class="font-semibold text-slate-800 dark:text-white">Co je UDID?</h3>
          <p class="text-sm text-slate-600 dark:text-white/70">
            UDID (Unique Device Identifier) je unikátní identifikátor vašeho zařízení. U MacBooků se nazývá <strong>Hardware UUID</strong> 
            a je potřeba pro registraci zařízení k instalaci sideloadovaných aplikací.
          </p>
        </div>
      </div>
    </div>

    <!-- Method 1: System Settings -->
    <div class="space-y-4">
      <h2 class="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
        <span class="w-8 h-8 rounded-full bg-gradient-to-br from-slate-500 to-zinc-600 text-white text-sm font-bold flex items-center justify-center">1</span>
        Metoda přes Nastavení systému
      </h2>
      
      <div class="space-y-6">
        <!-- Step 1 -->
        <div class="step-card group">
          <div class="step-number">1</div>
          <div class="step-content">
            <h3 class="step-title">Otevřete menu Apple</h3>
            <div class="step-description">
              <p>
                Klikněte na logo <strong>Apple </strong> v levém horním rohu obrazovky.
              </p>
            </div>
          </div>
        </div>

        <!-- Step 2 -->
        <div class="step-card group">
          <div class="step-number">2</div>
          <div class="step-content">
            <h3 class="step-title">Vyberte "O tomto Macu"</h3>
            <div class="step-description">
              <p>
                Z rozbalovací nabídky vyberte položku <strong>O tomto Macu</strong> (About This Mac).
              </p>
              <div class="mt-4 p-4 rounded-lg bg-slate-800 dark:bg-slate-900 border border-slate-700">
                <div class="space-y-2 text-white text-sm">
                  <div class="flex items-center gap-2 text-white/60">
                    <span class="text-lg"></span>
                    <span class="font-medium">Apple Menu</span>
                  </div>
                  <div class="pl-6 space-y-1">
                    <div class="px-3 py-1.5 rounded bg-blue-500/30 text-blue-300">O tomto Macu</div>
                    <div class="px-3 py-1 text-white/50">Nastavení systému...</div>
                    <div class="px-3 py-1 text-white/50">App Store...</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 3 -->
        <div class="step-card group">
          <div class="step-number">3</div>
          <div class="step-content">
            <h3 class="step-title">Klikněte na "Další informace..."</h3>
            <div class="step-description">
              <p>
                V okně "O tomto Macu" klikněte na tlačítko <strong>Další informace...</strong> (More Info...).
              </p>
            </div>
          </div>
        </div>

        <!-- Step 4 -->
        <div class="step-card group">
          <div class="step-number">4</div>
          <div class="step-content">
            <h3 class="step-title">Přejděte na "Systémová zpráva"</h3>
            <div class="step-description">
              <p>
                Scrollujte dolů a klikněte na <strong>Systémová zpráva...</strong> (System Report...).
              </p>
            </div>
          </div>
        </div>

        <!-- Step 5 -->
        <div class="step-card group">
          <div class="step-number">5</div>
          <div class="step-content">
            <h3 class="step-title">Najděte Hardware UUID</h3>
            <div class="step-description">
              <p>
                V levém panelu vyberte <strong>Hardware</strong>. V pravé části najdete řádek <strong>Hardware UUID</strong> - to je váš UDID.
              </p>
              <div class="mt-4 p-4 rounded-lg bg-slate-800 dark:bg-slate-900 border border-slate-700">
                <div class="space-y-3 text-sm">
                  <div class="flex items-center gap-2 text-white/60 border-b border-slate-700 pb-2">
                    <UIcon name="i-heroicons-computer-desktop" class="w-4 h-4" />
                    <span class="font-medium">Systémová zpráva</span>
                  </div>
                  <div class="grid grid-cols-2 gap-y-2">
                    <span class="text-white/60">Model Name:</span>
                    <span class="text-white">MacBook Pro</span>
                    <span class="text-white/60">Chip:</span>
                    <span class="text-white">Apple M1 Pro</span>
                    <span class="text-white/60">Serial Number:</span>
                    <span class="text-white">XXXXXXXXXXXX</span>
                    <span class="text-slate-400 font-semibold">Provisioning UUID:</span>
                    <span class="text-emerald-400 font-mono font-semibold">XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX</span>
                  </div>
                </div>
              </div>
              <div class="mt-3 p-3 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/20 text-sm">
                <UIcon name="i-heroicons-clipboard-document" class="w-4 h-4 text-emerald-500 inline mr-1" />
                <span class="text-slate-600 dark:text-white/70">
                  Klikněte pravým tlačítkem na UUID a vyberte <strong>Kopírovat</strong> pro zkopírování do schránky.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Method 2: Terminal -->
    <div class="space-y-4">
      <h2 class="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
        <span class="w-8 h-8 rounded-full bg-gradient-to-br from-slate-500 to-zinc-600 text-white text-sm font-bold flex items-center justify-center">2</span>
        Rychlá metoda přes Terminál
      </h2>
      
      <div class="space-y-6">
        <!-- Step 1 -->
        <div class="step-card group">
          <div class="step-number">1</div>
          <div class="step-content">
            <h3 class="step-title">Otevřete Terminál</h3>
            <div class="step-description">
              <p>
                Otevřete aplikaci <strong>Terminál</strong>. Najdete ji přes Spotlight (stiskněte <code>⌘ + Space</code>) 
                a napište "Terminal".
              </p>
              <div class="mt-3 flex items-center gap-2 text-sm">
                <kbd class="px-2 py-1 rounded bg-slate-200 dark:bg-white/10 font-mono">⌘</kbd>
                <span class="text-slate-500">+</span>
                <kbd class="px-2 py-1 rounded bg-slate-200 dark:bg-white/10 font-mono">Space</kbd>
                <span class="text-slate-500 dark:text-white/60 ml-2">→ napište "Terminal"</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 2 -->
        <div class="step-card group">
          <div class="step-number">2</div>
          <div class="step-content">
            <h3 class="step-title">Spusťte příkaz</h3>
            <div class="step-description">
              <p>
                Zkopírujte a vložte následující příkaz do Terminálu a stiskněte <strong>Enter</strong>:
              </p>
              <div class="mt-4 relative">
                <div class="p-4 rounded-lg bg-slate-900 border border-slate-700 font-mono text-sm overflow-x-auto">
                  <span class="text-emerald-400">$</span>
                  <span class="text-white ml-2">system_profiler SPHardwareDataType | grep "Hardware UUID"</span>
                </div>
              </div>
              <p class="mt-3 text-sm text-slate-500 dark:text-white/60">
                Alternativně můžete použít kratší příkaz:
              </p>
              <div class="mt-2 relative">
                <div class="p-4 rounded-lg bg-slate-900 border border-slate-700 font-mono text-sm overflow-x-auto">
                  <span class="text-emerald-400">$</span>
                  <span class="text-white ml-2">ioreg -d2 -c IOPlatformExpertDevice | awk -F\" '/IOPlatformUUID/{print $(NF-1)}'</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 3 -->
        <div class="step-card group">
          <div class="step-number">3</div>
          <div class="step-content">
            <h3 class="step-title">Zkopírujte výsledek</h3>
            <div class="step-description">
              <p>
                Terminál zobrazí váš Hardware UUID. Zkopírujte ho pro registraci.
              </p>
              <div class="mt-4 p-4 rounded-lg bg-slate-900 border border-slate-700 font-mono text-sm">
                <div class="text-white/60">Hardware UUID: <span class="text-emerald-400">XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Success -->
    <div class="rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 p-6">
      <div class="flex items-center gap-4">
        <UIcon name="i-heroicons-check-badge" class="w-10 h-10 text-emerald-500" />
        <div>
          <h3 class="font-semibold text-slate-800 dark:text-white">Hotovo! 🎉</h3>
          <p class="text-sm text-slate-600 dark:text-white/70 mt-1">
            Nyní máte svůj Hardware UUID (UDID). Pošlete ho administrátorovi pro registraci vašeho MacBooku.
          </p>
        </div>
      </div>
    </div>

    <!-- Contact admins -->
    <div class="rounded-xl bg-violet-500/10 dark:bg-violet-500/20 border border-violet-500/20 p-6">
      <div class="flex items-start gap-4">
        <div class="p-2 rounded-lg bg-violet-500/20">
          <svg class="w-6 h-6 text-violet-500" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
          </svg>
        </div>
        <div class="space-y-3">
          <h3 class="font-semibold text-slate-800 dark:text-white">Kontakt na administrátory</h3>
          <p class="text-sm text-slate-600 dark:text-white/70">
            Pro registraci zařízení kontaktujte některého z administrátorů přes Discord:
          </p>
          <div class="flex flex-wrap gap-3">
            <UButton
              to="https://discord.com/users/noway"
              target="_blank"
              color="violet"
              variant="soft"
              size="sm"
            >
              <svg class="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
              noway
            </UButton>
            <UButton
              to="https://discord.com/users/mrpajzl"
              target="_blank"
              color="violet"
              variant="soft"
              size="sm"
            >
              <svg class="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
              mrpajzl
            </UButton>
            <UButton
              to="https://discord.com/users/.zdenci"
              target="_blank"
              color="violet"
              variant="soft"
              size="sm"
            >
              <svg class="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
              .zdenci
            </UButton>
            <UButton
              to="https://discord.com/users/filemoncz"
              target="_blank"
              color="violet"
              variant="soft"
              size="sm"
            >
              <svg class="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
              filemoncz
            </UButton>
          </div>
        </div>
      </div>
    </div>

    <!-- Troubleshooting -->
    <div class="rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-6 space-y-4">
      <div class="flex items-center gap-3">
        <UIcon name="i-heroicons-wrench-screwdriver" class="w-6 h-6 text-slate-500" />
        <h3 class="font-semibold text-slate-800 dark:text-white">Časté dotazy</h3>
      </div>
      
      <div class="space-y-4">
        <div class="space-y-2">
          <h4 class="font-medium text-slate-700 dark:text-white/90">Je Hardware UUID stejný jako UDID?</h4>
          <p class="text-sm text-slate-600 dark:text-white/70">
            Ano, na MacBooku se UDID nazývá Hardware UUID. Jedná se o stejný typ unikátního identifikátoru zařízení.
          </p>
        </div>
        
        <div class="space-y-2">
          <h4 class="font-medium text-slate-700 dark:text-white/90">Změní se UDID po reinstalaci systému?</h4>
          <p class="text-sm text-slate-600 dark:text-white/70">
            Ne, Hardware UUID je svázán s hardwarem a zůstává stejný i po reinstalaci macOS.
          </p>
        </div>
        
        <div class="space-y-2">
          <h4 class="font-medium text-slate-700 dark:text-white/90">Mohu sdílet svůj UDID?</h4>
          <p class="text-sm text-slate-600 dark:text-white/70">
            UDID je unikátní identifikátor vašeho zařízení. Sdílejte ho pouze s důvěryhodnými osobami (např. administrátory FastSigner) pro účely registrace.
          </p>
        </div>
      </div>
    </div>

    <!-- Back to home -->
    <div class="flex justify-center">
      <UButton to="/" color="gray" variant="ghost" size="lg">
        <UIcon name="i-heroicons-arrow-left" class="w-4 h-4 mr-2" />
        Zpět na hlavní stránku
      </UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  title: 'Jak zjistit UDID MacBooku'
})
</script>

<style scoped>
.step-card {
  @apply flex gap-4 p-6 rounded-xl bg-white/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 transition-all duration-300;
}

.step-card:hover {
  @apply border-slate-400/30 shadow-lg shadow-slate-500/5;
}

.step-number {
  @apply flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-slate-500 to-zinc-600 text-white font-bold flex items-center justify-center text-lg shadow-lg;
}

.step-content {
  @apply flex-1 space-y-2;
}

.step-title {
  @apply text-lg font-semibold text-slate-800 dark:text-white;
}

.step-description {
  @apply text-slate-600 dark:text-white/70;
}

.step-description p {
  @apply leading-relaxed;
}

.step-description code {
  @apply px-1.5 py-0.5 rounded bg-slate-200 dark:bg-white/10 font-mono text-sm;
}
</style>

