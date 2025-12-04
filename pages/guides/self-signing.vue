<template>
  <div class="mt-10 px-5 max-w-4xl mx-auto space-y-8 pb-16">
    <!-- Header -->
    <div class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600/80 via-teal-700/90 to-cyan-800 p-8 border border-white/10">
      <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-400/10 via-transparent to-transparent"></div>
      <div class="absolute top-4 right-4 opacity-20">
        <UIcon name="i-heroicons-pencil-square" class="w-24 h-24 text-white" />
      </div>
      <div class="relative space-y-4">
        <div class="flex items-center gap-2 text-emerald-300 text-sm font-medium">
          <UIcon name="i-heroicons-book-open" class="w-4 h-4" />
          <span>Návod</span>
        </div>
        <h1 class="text-3xl md:text-4xl font-bold text-white">
          Jak si podepsat aplikace sám
        </h1>
        <p class="text-lg text-white/70 max-w-2xl">
          Průvodce podepisováním IPA souborů pomocí iSigner na macOS
        </p>
      </div>
    </div>

    <!-- macOS only warning -->
    <div class="rounded-xl bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/20 p-6">
      <div class="flex items-start gap-4">
        <div class="p-2 rounded-lg bg-amber-500/20">
          <UIcon name="i-heroicons-computer-desktop" class="w-6 h-6 text-amber-500" />
        </div>
        <div class="space-y-2">
          <h3 class="font-semibold text-slate-800 dark:text-white">Pouze pro macOS</h3>
          <p class="text-sm text-slate-600 dark:text-white/70">
            Tento návod je určen pouze pro uživatele macOS. Pokud nemáte Mac, můžete využít 
            <NuxtLink to="/guides/hackintosh-vmware" class="text-emerald-500 hover:underline">Hackintosh ve VMware</NuxtLink>.
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
            Pro získání certifikátu a registraci zařízení kontaktujte některého z administrátorů přes Discord:
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

    <!-- Steps -->
    <div class="space-y-6">
      <!-- Step 1 -->
      <div class="step-card group">
        <div class="step-number">1</div>
        <div class="step-content">
          <h3 class="step-title">Stáhněte a nainstalujte certifikát</h3>
          <div class="step-description">
            <p>
              Certifikát slouží k podepisování aplikací. Platnost certifikátu je vždy <strong>jeden rok</strong> od data vystavení.
            </p>
            <UButton
              to="https://iscc.site/"
              target="_blank"
              color="emerald"
              variant="soft"
              size="sm"
              class="mt-3"
            >
              <UIcon name="i-heroicons-arrow-top-right-on-square" class="w-4 h-4 mr-1" />
              Stáhnout certifikát z iscc.site
            </UButton>
            <div class="mt-4 p-4 rounded-lg bg-slate-100 dark:bg-white/5">
              <div class="flex items-start gap-3">
                <UIcon name="i-heroicons-key" class="w-6 h-6 text-emerald-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p class="font-medium text-slate-800 dark:text-white">Instalace certifikátu</p>
                  <p class="text-sm text-slate-600 dark:text-white/70">
                    Po stažení certifikát otevřete. Budete vyzváni k zadání hesla - to vám sdělí některý z adminů.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Step 2 -->
      <div class="step-card group">
        <div class="step-number">2</div>
        <div class="step-content">
          <h3 class="step-title">Stáhněte provisioning profil</h3>
          <div class="step-description">
            <p>
              Profil obsahuje seznam všech registrovaných zařízení. Pokud máte nové zařízení, je potřeba nejprve požádat admina o jeho registraci.
            </p>
            <div class="mt-3 p-3 rounded-lg bg-blue-500/10 dark:bg-blue-500/20 border border-blue-500/20 text-sm">
              <UIcon name="i-heroicons-information-circle" class="w-4 h-4 text-blue-500 inline mr-1" />
              <span class="text-slate-600 dark:text-white/70">
                Po registraci nového zařízení bude profil aktualizován a vystaven na webu ke stažení.
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Step 3 - Certificate trust issue -->
      <div class="step-card group">
        <div class="step-number">3</div>
        <div class="step-content">
          <h3 class="step-title">Řešení problému s důvěrou certifikátu (volitelné)</h3>
          <div class="step-description">
            <p>
              Pokud narazíte na problém s důvěrou certifikátu, stáhněte a nainstalujte kořenový certifikát od Apple:
            </p>
            <UButton
              to="https://www.apple.com/certificateauthority/AppleWWDRCAG3.cer"
              target="_blank"
              color="gray"
              variant="soft"
              size="sm"
              class="mt-3"
            >
              <UIcon name="i-heroicons-shield-check" class="w-4 h-4 mr-1" />
              Stáhnout Apple WWDR certifikát
            </UButton>
            <p class="mt-3 text-sm text-slate-500 dark:text-white/60">
              Po stažení certifikát nainstalujte. Tím dojde k ověření pravosti certifikátu pro podepisování aplikací.
            </p>
          </div>
        </div>
      </div>

      <!-- Step 4 -->
      <div class="step-card group">
        <div class="step-number">4</div>
        <div class="step-content">
          <h3 class="step-title">Stáhněte iOS App Signer</h3>
          <div class="step-description">
            <p>
              iOS App Signer je aplikace pro macOS, která umožňuje jednoduché podepisování IPA souborů.
            </p>
            <UButton
              to="https://dantheman827.github.io/ios-app-signer/"
              target="_blank"
              color="emerald"
              variant="soft"
              size="sm"
              class="mt-3"
            >
              <UIcon name="i-heroicons-arrow-down-tray" class="w-4 h-4 mr-1" />
              Stáhnout iOS App Signer
            </UButton>
          </div>
        </div>
      </div>

      <!-- Step 5 -->
      <div class="step-card group">
        <div class="step-number">5</div>
        <div class="step-content">
          <h3 class="step-title">Podepište aplikaci</h3>
          <div class="step-description">
            <p>
              Otevřete iOS App Signer a vyplňte následující pole:
            </p>
            
            <div class="mt-4 space-y-4">
              <!-- iSigner mockup -->
              <div class="p-4 rounded-xl bg-slate-800 dark:bg-slate-900 border border-slate-700">
                <div class="flex items-center gap-2 mb-4">
                  <div class="w-3 h-3 rounded-full bg-red-500"></div>
                  <div class="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div class="w-3 h-3 rounded-full bg-green-500"></div>
                  <span class="ml-2 text-white/60 text-sm">iOS App Signer</span>
                </div>
                
                <div class="space-y-3">
                  <div class="flex items-center gap-3">
                    <span class="text-white/70 text-sm w-40">Input file:</span>
                    <div class="flex-1 px-3 py-2 rounded bg-slate-700 text-white text-sm">
                      <span class="text-emerald-400">VašeAplikace.ipa</span>
                    </div>
                  </div>
                  <div class="flex items-center gap-3">
                    <span class="text-white/70 text-sm w-40">Signing Certificate:</span>
                    <div class="flex-1 px-3 py-2 rounded bg-slate-700 text-white text-sm">
                      <span class="text-emerald-400">Váš nainstalovaný certifikát</span>
                    </div>
                  </div>
                  <div class="flex items-center gap-3">
                    <span class="text-white/70 text-sm w-40">Provisioning Profile:</span>
                    <div class="flex-1 px-3 py-2 rounded bg-slate-700 text-white text-sm">
                      <span class="text-emerald-400">Stažený .mobileprovision</span>
                    </div>
                  </div>
                  <div class="flex items-center gap-3">
                    <span class="text-white/70 text-sm w-40">Ostatní pole:</span>
                    <div class="flex-1 px-3 py-2 rounded bg-slate-700 text-slate-500 text-sm">
                      Ponechte prázdné
                    </div>
                  </div>
                </div>
              </div>

              <ol class="space-y-2 text-slate-600 dark:text-white/70">
                <li class="flex items-start gap-2">
                  <span class="font-mono text-emerald-500 font-bold">a.</span>
                  <span><strong>Input file:</strong> Vyberte IPA soubor aplikace, kterou chcete podepsat</span>
                </li>
                <li class="flex items-start gap-2">
                  <span class="font-mono text-emerald-500 font-bold">b.</span>
                  <span><strong>Signing Certificate:</strong> Vyberte certifikát, který jste nainstalovali v kroku 1</span>
                </li>
                <li class="flex items-start gap-2">
                  <span class="font-mono text-emerald-500 font-bold">c.</span>
                  <span><strong>Provisioning Profile:</strong> Vyberte profil, který jste stáhli v kroku 2</span>
                </li>
                <li class="flex items-start gap-2">
                  <span class="font-mono text-emerald-500 font-bold">d.</span>
                  <span><strong>Ostatní pole:</strong> Ponechte prázdné</span>
                </li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      <!-- Step 6 -->
      <div class="step-card group">
        <div class="step-number">6</div>
        <div class="step-content">
          <h3 class="step-title">Spusťte podepisování</h3>
          <div class="step-description">
            <p>
              Klikněte na tlačítko <strong>Start</strong>. Vytvoří se nový podepsaný IPA soubor.
            </p>
            <div class="mt-4 flex items-center gap-3">
              <div class="flex-1 h-2 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                <div class="h-full w-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 animate-pulse"></div>
              </div>
              <span class="text-sm text-slate-500 dark:text-white/60">Podepisování...</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Step 7 -->
      <div class="step-card group">
        <div class="step-number">7</div>
        <div class="step-content">
          <h3 class="step-title">Hotovo! 🎉</h3>
          <div class="step-description">
            <p>
              Nyní máte podepsaný IPA soubor, který můžete nahrát do vašeho zařízení.
            </p>
            <div class="mt-4 p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20">
              <div class="flex items-center gap-3">
                <UIcon name="i-heroicons-check-badge" class="w-8 h-8 text-emerald-500" />
                <div>
                  <p class="font-semibold text-slate-800 dark:text-white">Aplikace podepsána</p>
                  <p class="text-sm text-slate-600 dark:text-white/70">Nový IPA soubor je připraven k instalaci</p>
                </div>
              </div>
            </div>
            
            <div class="mt-4 flex flex-wrap gap-2">
              <NuxtLink to="/guides/ios-mac-installation">
                <UButton color="emerald" variant="soft" size="sm">
                  <UIcon name="i-heroicons-device-phone-mobile" class="w-4 h-4 mr-1" />
                  Návod: Instalace na iOS
                </UButton>
              </NuxtLink>
              <NuxtLink to="/guides/apple-tv-sideloading">
                <UButton color="emerald" variant="soft" size="sm">
                  <UIcon name="i-heroicons-tv" class="w-4 h-4 mr-1" />
                  Návod: Instalace na Apple TV
                </UButton>
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Troubleshooting -->
    <div class="rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-6 space-y-4">
      <div class="flex items-center gap-3">
        <UIcon name="i-heroicons-wrench-screwdriver" class="w-6 h-6 text-slate-500" />
        <h3 class="font-semibold text-slate-800 dark:text-white">Řešení problémů</h3>
      </div>
      
      <div class="space-y-4">
        <div class="space-y-2">
          <h4 class="font-medium text-slate-700 dark:text-white/90">Certifikát není důvěryhodný</h4>
          <ul class="text-sm text-slate-600 dark:text-white/70 space-y-1 ml-4">
            <li>• Stáhněte a nainstalujte Apple WWDR certifikát (krok 3)</li>
            <li>• Zkontrolujte, že certifikát ještě nevypršel</li>
          </ul>
        </div>
        
        <div class="space-y-2">
          <h4 class="font-medium text-slate-700 dark:text-white/90">Podepisování selže</h4>
          <ul class="text-sm text-slate-600 dark:text-white/70 space-y-1 ml-4">
            <li>• Zkontrolujte, že máte správný certifikát a profil</li>
            <li>• Ujistěte se, že vaše zařízení je registrované v profilu</li>
            <li>• Zkuste stáhnout nejnovější verzi profilu</li>
          </ul>
        </div>
        
        <div class="space-y-2">
          <h4 class="font-medium text-slate-700 dark:text-white/90">Aplikace se nenainstaluje</h4>
          <ul class="text-sm text-slate-600 dark:text-white/70 space-y-1 ml-4">
            <li>• Zkontrolujte, že UDID vašeho zařízení je v profilu</li>
            <li>• Požádejte admina o přidání zařízení, pokud je nové</li>
            <li>• Stáhněte aktualizovaný profil po registraci</li>
          </ul>
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
  title: 'Vlastní podepisování aplikací'
})
</script>

<style scoped>
.step-card {
  @apply flex gap-4 p-6 rounded-xl bg-white/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 transition-all duration-300;
}

.step-card:hover {
  @apply border-emerald-500/30 shadow-lg shadow-emerald-500/5;
}

.step-number {
  @apply flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 text-white font-bold flex items-center justify-center text-lg shadow-lg;
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

