import { mapState } from 'vuex';

import vtkListenerHelper from 'paraview-glance/src/ListenerHelper';

import ColorByWidget from 'paraview-glance/src/components/controls/ColorBy';
import InformationWidget from 'paraview-glance/src/components/controls/Information';
import MoleculeWidget from 'paraview-glance/src/components/controls/Molecule';
import RepresentationWidget from 'paraview-glance/src/components/controls/Representation';
import SliceWidget from 'paraview-glance/src/components/controls/SliceControl';
import ColorGroup from 'paraview-glance/src/components/widgets/ColorGroup';
import { Mutations } from 'paraview-glance/src/stores/types';

// ----------------------------------------------------------------------------
// Component API
// ----------------------------------------------------------------------------

function onMounted() {
  this.subscriptions = [
    this.proxyManager.onProxyRegistrationChange(({ proxyGroup }) => {
      if (proxyGroup === 'Sources') {
        this.datasets = this.proxyManager.getSources();
      }
      this.listenerHelper.resetListeners();
    }),
  ];
}

// ----------------------------------------------------------------------------

function onBeforeDestroy() {
  this.listenerHelper.removeListeners();
  while (this.subscriptions.length) {
    this.subscriptions.pop().unsubscribe();
  }
}

// ----------------------------------------------------------------------------

function deleteDataset(proxy) {
  this.proxyToDelete = proxy;
  // work-around for bug where vuetify's menu loses its activator
  // when deleting datasets. Waiting 100ms should be enough time
  // for vuetify's menu to hide before actually deleting the dataset.
  window.setTimeout(() => {
    this.proxyManager.deleteProxy(proxy);
    this.proxyManager.renderAllViews();
    this.proxyToDelete = null;
  }, 100);
}

// ----------------------------------------------------------------------------

function getDatasetVisibility(source) {
  return this.proxyManager
    .getRepresentations()
    .filter((r) => r.getInput() === source)[0]
    .isVisible();
}

// ----------------------------------------------------------------------------

function toggleDatasetVisibility(source) {
  const visible = !this.getDatasetVisibility(source);
  this.proxyManager
    .getRepresentations()
    .filter((r) => r.getInput() === source)
    .forEach((r) => r.setVisibility(visible));
  this.$forceUpdate();
}

// ----------------------------------------------------------------------------

export default {
  name: 'Datasets',
  components: {
    ColorGroup,
  },
  data() {
    return {
      datasets: [],
      proxyToDelete: null,
    };
  },
  computed: mapState({
    proxyManager: 'proxyManager',
    panels: (state) => {
      const priorities = Object.keys(state.panels);
      priorities.sort((a, b) => Number(a) - Number(b));
      return [].concat(...priorities.map((prio) => state.panels[prio]));
    },
  }),
  created() {
    this.subscriptions = [];
    this.listenerHelper = vtkListenerHelper.newInstance(
      () => {
        this.$nextTick(this.$forceUpdate);
      },
      () => [this.proxyManager].concat(this.proxyManager.getRepresentations())
    );

    [
      ColorByWidget,
      InformationWidget,
      MoleculeWidget,
      RepresentationWidget,
      SliceWidget,
    ].forEach((panel, i) => this.addPanel(panel, i + 10));
  },
  mounted() {
    this.$nextTick(this.onMounted);
  },
  beforeDestroy() {
    this.onBeforeDestroy();
  },
  methods: {
    onMounted,
    onBeforeDestroy,
    deleteDataset,
    getDatasetVisibility,
    toggleDatasetVisibility,
    addPanel(component, priority) {
      this.$store.commit(Mutations.ADD_PANEL, { component, priority });
    },
  },
};
