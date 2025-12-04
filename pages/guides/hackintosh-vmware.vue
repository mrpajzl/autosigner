<template>
  <div class="mt-10 px-5 max-w-4xl mx-auto space-y-8 pb-16">
    <!-- Header -->
    <div class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-zinc-800 to-slate-900 p-8 border border-white/10">
      <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-orange-500/10 via-transparent to-transparent"></div>
      <div class="absolute top-4 right-4 opacity-20">
        <UIcon name="i-heroicons-computer-desktop" class="w-24 h-24 text-white" />
      </div>
      <div class="relative space-y-4">
        <div class="flex items-center gap-2 text-orange-400 text-sm font-medium">
          <UIcon name="i-heroicons-book-open" class="w-4 h-4" />
          <span>Návod</span>
        </div>
        <h1 class="text-3xl md:text-4xl font-bold text-white">
          Hackintosh ve VMware na Windows
        </h1>
        <p class="text-lg text-white/70 max-w-2xl">
          Průvodce instalací macOS ve virtuálním stroji pro sideloading na Apple TV
        </p>
      </div>
    </div>

    <!-- Warning -->
    <div class="rounded-xl bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/20 p-6">
      <div class="flex items-start gap-4">
        <div class="p-2 rounded-lg bg-amber-500/20">
          <UIcon name="i-heroicons-exclamation-triangle" class="w-6 h-6 text-amber-500" />
        </div>
        <div class="space-y-2">
          <h3 class="font-semibold text-slate-800 dark:text-white">Proč potřebuji macOS?</h3>
          <p class="text-sm text-slate-600 dark:text-white/70">
            Apple Configurator 2 je dostupný pouze na macOS. Pokud nemáte Mac, můžete použít virtuální stroj s macOS (Hackintosh) pro instalaci aplikací na Apple TV.
          </p>
        </div>
      </div>
    </div>

    <!-- Tab selector -->
    <div class="flex gap-2 p-1 rounded-xl bg-slate-100 dark:bg-white/5">
      <button 
        @click="activeTab = 'vmware'" 
        :class="[
          'flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all',
          activeTab === 'vmware' 
            ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm' 
            : 'text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white'
        ]"
      >
        <UIcon name="i-heroicons-computer-desktop" class="w-4 h-4 inline mr-2" />
        VMware Player / Workstation
      </button>
      <button 
        @click="activeTab = 'esxi'" 
        :class="[
          'flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all',
          activeTab === 'esxi' 
            ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm' 
            : 'text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white'
        ]"
      >
        <UIcon name="i-heroicons-server" class="w-4 h-4 inline mr-2" />
        VMware ESXi
      </button>
    </div>

    <!-- VMware Player / Workstation Guide -->
    <div v-if="activeTab === 'vmware'" class="space-y-6">
      <h2 class="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
        <UIcon name="i-heroicons-computer-desktop" class="w-6 h-6 text-orange-500" />
        Instalace na VMware Player / Workstation Pro
      </h2>

      <!-- Downloads section -->
      <div class="rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-6 space-y-4">
        <h3 class="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
          <UIcon name="i-heroicons-arrow-down-tray" class="w-5 h-5 text-orange-500" />
          Potřebné soubory ke stažení
        </h3>
        
        <div class="space-y-3">
          <div class="p-3 rounded-lg bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10">
            <div class="flex items-center justify-between">
              <div>
                <p class="font-medium text-slate-800 dark:text-white">VMware Player 17</p>
                <p class="text-xs text-slate-500 dark:text-white/60">Bezplatná verze pro osobní použití</p>
              </div>
              <UButton 
                to="https://webshare.cz/#/file/zyaU0ZhOzo/vmware-player-full-17-0-1-21139696-exe" 
                target="_blank" 
                color="orange" 
                variant="soft" 
                size="sm"
              >
                Stáhnout
              </UButton>
            </div>
          </div>

          <div class="p-3 rounded-lg bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10">
            <div class="flex items-center justify-between">
              <div>
                <p class="font-medium text-slate-800 dark:text-white">VMware Workstation Pro</p>
                <p class="text-xs text-slate-500 dark:text-white/60">Alternativa - 30 dní trial nebo licenční klíč</p>
              </div>
              <UButton 
                to="https://webshare.cz/#/file/0VV59OwEVE" 
                target="_blank" 
                color="orange" 
                variant="soft" 
                size="sm"
              >
                Stáhnout
              </UButton>
            </div>
          </div>

          <div class="p-3 rounded-lg bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10">
            <div class="flex items-center justify-between">
              <div>
                <p class="font-medium text-slate-800 dark:text-white">Unlocker for VMware</p>
                <p class="text-xs text-slate-500 dark:text-white/60">Odemkne možnost spuštění macOS</p>
              </div>
              <UButton 
                to="https://webshare.cz/#/file/7wM5pNzSmK/unlocker-for-vmware-zip" 
                target="_blank" 
                color="orange" 
                variant="soft" 
                size="sm"
              >
                Stáhnout
              </UButton>
            </div>
          </div>

          <div class="p-3 rounded-lg bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10">
            <div class="flex items-center justify-between">
              <div>
                <p class="font-medium text-slate-800 dark:text-white">macOS 13 Ventura (část 1)</p>
                <p class="text-xs text-slate-500 dark:text-white/60">macOS13.zip.001</p>
              </div>
              <UButton 
                to="https://webshare.cz/#/file/8wjNGORbJV" 
                target="_blank" 
                color="orange" 
                variant="soft" 
                size="sm"
              >
                Stáhnout
              </UButton>
            </div>
          </div>

          <div class="p-3 rounded-lg bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10">
            <div class="flex items-center justify-between">
              <div>
                <p class="font-medium text-slate-800 dark:text-white">macOS 13 Ventura (část 2)</p>
                <p class="text-xs text-slate-500 dark:text-white/60">macOS13.zip.002</p>
              </div>
              <UButton 
                to="https://webshare.cz/#/file/woh9AmJpo8" 
                target="_blank" 
                color="orange" 
                variant="soft" 
                size="sm"
              >
                Stáhnout
              </UButton>
            </div>
          </div>
        </div>

        <div class="mt-4 p-3 rounded-lg bg-blue-500/10 dark:bg-blue-500/20 border border-blue-500/20 text-sm">
          <UIcon name="i-heroicons-information-circle" class="w-4 h-4 text-blue-500 inline mr-1" />
          <span class="text-slate-600 dark:text-white/70">
            Licenční klíč pro Workstation Pro najdete na 
            <a href="https://gist.github.com/PurpleVibe32" target="_blank" class="text-blue-500 hover:underline">GitHub Gist</a>. 
            Jinak máte 30 dní trial.
          </span>
        </div>
      </div>

      <!-- Steps -->
      <div class="space-y-6">
        <div class="step-card group">
          <div class="step-number">1</div>
          <div class="step-content">
            <h3 class="step-title">Nainstalujte VMware</h3>
            <div class="step-description">
              <p>
                Stáhněte a nainstalujte VMware Player nebo Workstation Pro. Postupujte podle instalačního průvodce.
              </p>
            </div>
          </div>
        </div>

        <div class="step-card group">
          <div class="step-number">2</div>
          <div class="step-content">
            <h3 class="step-title">Stáhněte a rozbalte soubory</h3>
            <div class="step-description">
              <p>Stáhněte všechny soubory výše a rozbalte je:</p>
              <ul class="mt-2 space-y-1 text-slate-600 dark:text-white/70">
                <li>• <strong>Unlocker</strong> - rozbalte do samostatné složky</li>
                <li>• <strong>macOS13.zip.001 + .002</strong> - rozbalte pomocí 7-Zip (vyberte .001 a rozbalit)</li>
              </ul>
            </div>
          </div>
        </div>

        <div class="step-card group">
          <div class="step-number">3</div>
          <div class="step-content">
            <h3 class="step-title">Zavřete VMware a spusťte Unlocker</h3>
            <div class="step-description">
              <p>
                <strong>Důležité:</strong> Před spuštěním Unlockeru musí být VMware úplně vypnutý!
              </p>
              <div class="mt-3 p-4 rounded-lg bg-slate-800 dark:bg-slate-900 border border-slate-700">
                <div class="flex items-center gap-2 text-white font-mono text-sm">
                  <UIcon name="i-heroicons-shield-check" class="w-4 h-4 text-orange-400" />
                  <span>Spustit jako správce:</span>
                  <code class="text-orange-400">win-install.cmd</code>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="step-card group">
          <div class="step-number">4</div>
          <div class="step-content">
            <h3 class="step-title">Spusťte VMware a importujte macOS</h3>
            <div class="step-description">
              <ol class="space-y-2 text-slate-600 dark:text-white/70">
                <li class="flex items-start gap-2">
                  <span class="font-mono text-orange-500 font-bold">a.</span>
                  <span>Otevřete VMware Player/Workstation</span>
                </li>
                <li class="flex items-start gap-2">
                  <span class="font-mono text-orange-500 font-bold">b.</span>
                  <span>Vyberte <strong>Open a Virtual Machine</strong></span>
                </li>
                <li class="flex items-start gap-2">
                  <span class="font-mono text-orange-500 font-bold">c.</span>
                  <span>Najděte rozbalenou složku macOS13 a vyberte soubor <code>macOS 13.vmx</code></span>
                </li>
              </ol>
            </div>
          </div>
        </div>

        <div class="step-card group">
          <div class="step-number">5</div>
          <div class="step-content">
            <h3 class="step-title">Spusťte virtuální macOS</h3>
            <div class="step-description">
              <p>
                Klikněte na <strong>Play virtual machine</strong>. Systém se spustí a zobrazí přihlašovací obrazovku.
              </p>
              <div class="mt-4 p-4 rounded-lg bg-slate-100 dark:bg-white/5">
                <div class="flex items-center gap-3">
                  <UIcon name="i-heroicons-key" class="w-8 h-8 text-orange-500" />
                  <div>
                    <p class="font-medium text-slate-800 dark:text-white">Přihlašovací údaje</p>
                    <p class="text-sm text-slate-600 dark:text-white/70">Uživatel: <strong>User</strong> · Heslo: <strong>1234</strong></p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ESXi Guide -->
    <div v-if="activeTab === 'esxi'" class="space-y-6">
      <h2 class="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
        <UIcon name="i-heroicons-server" class="w-6 h-6 text-orange-500" />
        Instalace na VMware ESXi 7.0 Update 3
      </h2>

      <!-- Downloads section -->
      <div class="rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-6 space-y-4">
        <h3 class="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
          <UIcon name="i-heroicons-arrow-down-tray" class="w-5 h-5 text-orange-500" />
          Potřebné soubory ke stažení
        </h3>
        
        <div class="space-y-3">
          <div class="p-3 rounded-lg bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10">
            <div class="flex items-center justify-between">
              <div>
                <p class="font-medium text-slate-800 dark:text-white">ESXi Unlocker</p>
                <p class="text-xs text-slate-500 dark:text-white/60">esxi-unlocker-master.zip</p>
              </div>
              <UButton 
                to="https://webshare.cz/#/file/tN8AY05S5h/esxi-unlocker-master-zip" 
                target="_blank" 
                color="orange" 
                variant="soft" 
                size="sm"
              >
                Stáhnout
              </UButton>
            </div>
          </div>

          <div class="p-3 rounded-lg bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10">
            <div class="flex items-center justify-between">
              <div>
                <p class="font-medium text-slate-800 dark:text-white">macOS 13 ESXi (část 1)</p>
                <p class="text-xs text-slate-500 dark:text-white/60">macOS13esxi.zip.001</p>
              </div>
              <UButton 
                to="https://webshare.cz/#/file/od9elecQd4" 
                target="_blank" 
                color="orange" 
                variant="soft" 
                size="sm"
              >
                Stáhnout
              </UButton>
            </div>
          </div>

          <div class="p-3 rounded-lg bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10">
            <div class="flex items-center justify-between">
              <div>
                <p class="font-medium text-slate-800 dark:text-white">macOS 13 ESXi (část 2)</p>
                <p class="text-xs text-slate-500 dark:text-white/60">macOS13esxi.zip.002</p>
              </div>
              <UButton 
                to="https://webshare.cz/#/file/JPWuye7yzF" 
                target="_blank" 
                color="orange" 
                variant="soft" 
                size="sm"
              >
                Stáhnout
              </UButton>
            </div>
          </div>
        </div>
      </div>

      <!-- Steps -->
      <div class="space-y-6">
        <div class="step-card group">
          <div class="step-number">1</div>
          <div class="step-content">
            <h3 class="step-title">Povolte SSH a nahrajte soubory</h3>
            <div class="step-description">
              <p>
                V ESXi webovém rozhraní povolte SSH a nahrajte ZIP soubory do datastoru.
              </p>
            </div>
          </div>
        </div>

        <div class="step-card group">
          <div class="step-number">2</div>
          <div class="step-content">
            <h3 class="step-title">Připojte se přes SSH a rozbalte unlocker</h3>
            <div class="step-description">
              <div class="mt-3 p-4 rounded-lg bg-slate-800 dark:bg-slate-900 border border-slate-700 space-y-2 font-mono text-sm">
                <p class="text-slate-400"># Přejděte do složky s nahranými soubory</p>
                <p class="text-green-400">cd /vmfs/volumes/datastore1/macOS13</p>
                <p class="text-slate-400 mt-3"># Rozbalte unlocker</p>
                <p class="text-green-400">unzip esxi-unlocker-master.zip</p>
                <p class="text-slate-400 mt-3"># Nastavte oprávnění</p>
                <p class="text-green-400">chmod 775 -R esxi-unlocker-301/</p>
              </div>
            </div>
          </div>
        </div>

        <div class="step-card group">
          <div class="step-number">3</div>
          <div class="step-content">
            <h3 class="step-title">Spusťte unlocker</h3>
            <div class="step-description">
              <div class="mt-3 p-4 rounded-lg bg-slate-800 dark:bg-slate-900 border border-slate-700 space-y-2 font-mono text-sm">
                <p class="text-green-400">cd esxi-unlocker-301/</p>
                <p class="text-slate-400 mt-3"># Test - mělo by vypsat smcPresent = false</p>
                <p class="text-green-400">./esxi-smctest.sh</p>
                <p class="text-slate-400 mt-3"># Instalace unlockeru</p>
                <p class="text-green-400">./esxi-install.sh</p>
              </div>
            </div>
          </div>
        </div>

        <div class="step-card group">
          <div class="step-number">4</div>
          <div class="step-content">
            <h3 class="step-title">Restartujte ESXi server</h3>
            <div class="step-description">
              <div class="mt-3 p-4 rounded-lg bg-slate-800 dark:bg-slate-900 border border-slate-700 font-mono text-sm">
                <p class="text-green-400">reboot</p>
              </div>
              <div class="mt-3 p-3 rounded-lg bg-red-500/10 dark:bg-red-500/20 border border-red-500/20 text-sm">
                <UIcon name="i-heroicons-exclamation-circle" class="w-4 h-4 text-red-500 inline mr-1" />
                <span class="text-slate-600 dark:text-white/70">
                  <strong>Pozor:</strong> Toto restartuje celý ESXi server!
                </span>
              </div>
            </div>
          </div>
        </div>

        <div class="step-card group">
          <div class="step-number">5</div>
          <div class="step-content">
            <h3 class="step-title">Ověřte instalaci unlockeru</h3>
            <div class="step-description">
              <div class="mt-3 p-4 rounded-lg bg-slate-800 dark:bg-slate-900 border border-slate-700 space-y-2 font-mono text-sm">
                <p class="text-green-400">cd /vmfs/volumes/datastore1/macOS13/esxi-unlocker-301/</p>
                <p class="text-green-400">./esxi-smctest.sh</p>
                <p class="text-slate-400 mt-3"># Mělo by vypsat: smcPresent = true, custom.vgz = false</p>
              </div>
            </div>
          </div>
        </div>

        <div class="step-card group">
          <div class="step-number">6</div>
          <div class="step-content">
            <h3 class="step-title">Registrujte VM a spusťte</h3>
            <div class="step-description">
              <ol class="space-y-2 text-slate-600 dark:text-white/70">
                <li class="flex items-start gap-2">
                  <span class="font-mono text-orange-500 font-bold">a.</span>
                  <span>V ESXi vytvořte novou VM</span>
                </li>
                <li class="flex items-start gap-2">
                  <span class="font-mono text-orange-500 font-bold">b.</span>
                  <span>Vyberte <strong>Register existing VM</strong></span>
                </li>
                <li class="flex items-start gap-2">
                  <span class="font-mono text-orange-500 font-bold">c.</span>
                  <span>Vyberte rozbalený .vmx soubor</span>
                </li>
                <li class="flex items-start gap-2">
                  <span class="font-mono text-orange-500 font-bold">d.</span>
                  <span>Spusťte VM</span>
                </li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Common section - Apple TV pairing -->
    <div class="space-y-6 pt-6 border-t border-slate-200 dark:border-white/10">
      <h2 class="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
        <UIcon name="i-heroicons-tv" class="w-6 h-6 text-red-500" />
        Párování Apple TV v macOS
      </h2>

      <div class="step-card group">
        <div class="step-number bg-gradient-to-br from-red-500 to-pink-500">
          <UIcon name="i-heroicons-tv" class="w-5 h-5" />
        </div>
        <div class="step-content">
          <h3 class="step-title">Spárujte Apple TV</h3>
          <div class="step-description">
            <p>Apple Configurator je již nainstalovaný v připraveném macOS:</p>
            <ol class="mt-3 space-y-2 text-slate-600 dark:text-white/70">
              <li class="flex items-start gap-2">
                <span class="font-mono text-red-500 font-bold">1.</span>
                <span>Na Apple TV přejděte do <strong>Nastavení → Ovladače a zařízení → Aplikace Remote a zařízení</strong></span>
              </li>
              <li class="flex items-start gap-2">
                <span class="font-mono text-red-500 font-bold">2.</span>
                <span>V Apple Configurator vyberte <strong>Apple Configurator</strong> v menu → <strong>Paired Devices...</strong></span>
              </li>
              <li class="flex items-start gap-2">
                <span class="font-mono text-red-500 font-bold">3.</span>
                <span>Vyhledá vaši Apple TV - klikněte na <strong>Spárovat</strong></span>
              </li>
              <li class="flex items-start gap-2">
                <span class="font-mono text-red-500 font-bold">4.</span>
                <span>Na Apple TV se zobrazí párovací kód - zadejte ho do Apple Configurator</span>
              </li>
              <li class="flex items-start gap-2">
                <span class="font-mono text-red-500 font-bold">5.</span>
                <span>Po spárování: pravý klik na TV → <strong>Add</strong> → <strong>Apps</strong> → vyberte .IPA soubor</span>
              </li>
            </ol>
          </div>
        </div>
      </div>
    </div>

    <!-- Optional: Manual installation -->
    <div class="rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-6 space-y-4">
      <div class="flex items-center gap-3">
        <UIcon name="i-heroicons-cog-6-tooth" class="w-6 h-6 text-slate-500" />
        <h3 class="font-semibold text-slate-800 dark:text-white">Vlastní instalace macOS (volitelné)</h3>
      </div>
      
      <p class="text-sm text-slate-600 dark:text-white/70">
        Pokud chcete nainstalovat macOS od nuly místo použití připraveného obrazu:
      </p>

      <div class="space-y-3">
        <div class="p-3 rounded-lg bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10">
          <div class="flex items-center justify-between">
            <div>
              <p class="font-medium text-slate-800 dark:text-white">macOS Ventura ISO</p>
              <p class="text-xs text-slate-500 dark:text-white/60">Instalační obraz</p>
            </div>
            <UButton 
              to="https://webshare.cz/#/file/o4BZgkZIr4/macos-ventura-iso-for-vm-iso" 
              target="_blank" 
              color="gray" 
              variant="soft" 
              size="sm"
            >
              Stáhnout
            </UButton>
          </div>
        </div>

        <div class="p-3 rounded-lg bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10">
          <div class="flex items-center justify-between">
            <div>
              <p class="font-medium text-slate-800 dark:text-white">VMware Tools</p>
              <p class="text-xs text-slate-500 dark:text-white/60">Pro lepší výkon a integraci</p>
            </div>
            <UButton 
              to="https://webshare.cz/#/file/uenYlKwwiP/vmwaretools-iso" 
              target="_blank" 
              color="gray" 
              variant="soft" 
              size="sm"
            >
              Stáhnout
            </UButton>
          </div>
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
  title: 'Hackintosh ve VMware'
})

const activeTab = ref<'vmware' | 'esxi'>('vmware')
</script>

<style scoped>
.step-card {
  @apply flex gap-4 p-6 rounded-xl bg-white/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 transition-all duration-300;
}

.step-card:hover {
  @apply border-orange-500/30 shadow-lg shadow-orange-500/5;
}

.step-number {
  @apply flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 text-white font-bold flex items-center justify-center text-lg shadow-lg;
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

